// Panel.js
SS.extend({
  createCocoaObject: function (methods, superclass) {
    var uniqueClassName =   "SS.sketch_" + NSUUID.UUID().UUIDString();
    var classDesc = MOClassDescription.allocateDescriptionForClassWithName_superclass_(uniqueClassName, superclass || NSObject);
    classDesc.registerClass();
    for (var selectorString in methods) {
      var selector = NSSelectorFromString(selectorString);
      [classDesc addInstanceMethodWithSelector:selector function:(methods[selectorString])];
    }
    return NSClassFromString(uniqueClassName).new();
  },

  addFirstMouseAcceptor: function (webView, contentView) {
    var button = this.createCocoaObject({
      'mouseDown:': function (evt) {
        // Remove this view. Subsequent events such the mouseUp event that will
        // probably immediately follow mouseDown or any other mouse events will
        // be handled as if this view is not here because it will not be here!
        this.removeFromSuperview();

        // Now send the same mouseDown event again as if the user had just
        // clicked. With the button gone, this will be handled by the WebView.
        NSApplication.sharedApplication().sendEvent(evt);
      },
    }, NSButton);

    button.setIdentifier('firstMouseAcceptor');
    button.setTransparent(true);
    button.setTranslatesAutoresizingMaskIntoConstraints(false);

    contentView.addSubview(button);

    var views = {
      button: button,
      webView: webView
    };

    // Match width of WebView.
    contentView.addConstraints([NSLayoutConstraint
            constraintsWithVisualFormat:'H:[button(==webView)]'
            options:NSLayoutFormatDirectionLeadingToTrailing
            metrics:null
            views:views]);

    // Match height of WebView.
    contentView.addConstraints([NSLayoutConstraint
            constraintsWithVisualFormat:'V:[button(==webView)]'
            options:NSLayoutFormatDirectionLeadingToTrailing
            metrics:null
            views:views]);

    // Match top of WebView.
    contentView.addConstraints([[NSLayoutConstraint
            constraintWithItem:button attribute:NSLayoutAttributeTop
            relatedBy:NSLayoutRelationEqual toItem:webView
            attribute:NSLayoutAttributeTop multiplier:1 constant:0]]);
  },

  SSPanel: function (options) {
    var self = this,
      threadDictionary,
      options = this.extend(options, {
        url: this.pluginSketch + "/panel/index.html",
        width: 240,
        height: 316,
        floatWindow: false,
        hiddenClose: false,
        data: {},
        callback: function (data) { return data; }
      }),
      result = false;
    options.url = encodeURI("file://" + options.url);

    var frame = NSMakeRect(0, 0, options.width, (options.height + 32)),
      titleBgColor = NSColor.colorWithRed_green_blue_alpha(244 / 255, 180 / 255, 0 / 255, 1),
      contentBgColor = NSColor.colorWithRed_green_blue_alpha(1, 1, 1, 1);

    if (options.identifier) {
      threadDictionary = NSThread.mainThread().threadDictionary();
    }

    if (options.identifier && threadDictionary[options.identifier]) {
      return false;
    }

    var Panel = NSPanel.alloc().init();

    // var Panel = NSPanel.alloc().initWithContentRect_styleMask_backing_defer(frame, 31, 2, 'YES');
    Panel.setTitleVisibility(NSWindowTitleHidden);
    Panel.setTitlebarAppearsTransparent(true);
    Panel.standardWindowButton(NSWindowCloseButton).setHidden(options.hiddenClose);
    Panel.standardWindowButton(NSWindowMiniaturizeButton).setHidden(true);
    Panel.standardWindowButton(NSWindowZoomButton).setHidden(true);
    Panel.setFrame_display(frame, true);
    Panel.setBackgroundColor(contentBgColor);
    Panel.setWorksWhenModal(true);

    if (options.floatWindow) {
      Panel.becomeKeyWindow();
      Panel.setLevel(NSFloatingWindowLevel);
      threadDictionary[options.identifier] = Panel;
      // Long-running script
      COScript.currentCOScript().setShouldKeepAround_(true);
    }

    var contentView = Panel.contentView(),
      webView = WebView.alloc().initWithFrame(NSMakeRect(0, 0, options.width, options.height));

    var windowObject = webView.windowScriptObject();

    contentView.setWantsLayer(true);
    contentView.layer().setFrame(contentView.frame());
    // contentView.layer().setCornerRadius(6);
    // contentView.layer().setMasksToBounds(true);

    webView.setBackgroundColor(contentBgColor);
    webView.setMainFrameURL_(options.url);
    contentView.addSubview(webView);

    var delegate = new MochaJSDelegate({
      "webView:didFinishLoadForFrame:": (function (webView, webFrame) {
        DOMReady = [
            "$(",
                "function(){",
                    "init(" + JSON.stringify(options.data) + ")",
                "}",
            ");"
        ].join("");

        try  {
          if (self.configs.presentation) {
            windowObject.evaluateWebScript("currentPresentation = {};");
            windowObject.evaluateWebScript("currentPresentation.name = " + JSON.stringify(self.configs.presentation.name) + ";");
            windowObject.evaluateWebScript("currentPresentation.id =" + JSON.stringify(self.configs.presentation.id) + ";");
            windowObject.evaluateWebScript("window.lastUpdated =" + JSON.stringify(self.configs.lastUpdated) + ";");
          }

          windowObject.evaluateWebScript("window.preferences =" + JSON.stringify(self.configs.preferences) + ";");
          windowObject.evaluateWebScript("window.version =" + JSON.stringify(self.version) + ";");
        } catch(e) {
          log(e);
        }

        windowObject.evaluateWebScript('_onLoad();');
        windowObject.evaluateWebScript(DOMReady);
      }),
      "webView:didChangeLocationWithinPageForFrame:": (function (webView, webFrame) {
        var request = NSURL.URLWithString(webView.mainFrameURL()).fragment();

        if (request == "submit") {
          var data = JSON.parse(decodeURI(windowObject.valueForKey("SSData")));
          options.callback(data);
          result = true;
          if (!options.floatWindow) {
            windowObject.evaluateWebScript("window.location.hash = 'close';");
          }
        }

        if (request == 'fetchUser') {
          SS.frameWork.userInfo(webView);
        }

        if (request == 'lastUpdated') {
          var lastUpdated = JSON.parse(decodeURI(windowObject.valueForKey("lastUpdated")));
          self.configs = self.setConfigs({ lastUpdated: lastUpdated });
        }

        if (request == 'refreshArtboards') {
          newData = SS.getAllArtboardsData();
          self.allData = newData;
          var d = JSON.stringify(newData);
          windowObject.evaluateWebScript("init(" + d + ")");
        }

        if (request == 'fetchPresentation') {
          var data = JSON.parse(decodeURI(windowObject.valueForKey("SSData")));
          SS.frameWork.fetchPresentation_webView_shouldUpload(data.presentationId, webView, false);
        }

        if (request == 'signIn') {
          SS.frameWork.signIn(webView);
        }

        if (request == 'signOut') {
          SS.frameWork.signOut(webView);
        }

        if (request == 'LogOutSuccess') {
          windowObject.evaluateWebScript("window.location.href = 'login.html';");
        }

        if (request == 'openLink') {
          var data = JSON.parse(decodeURI(windowObject.valueForKey("Link")));
          SS.openURL(data);
        }

        if (request == 'LogInSuccess') {
          SS['frameWork'] = SS.initFramework(SS.context, 'SyncToSlides');
          windowObject.evaluateWebScript("window.location.href = 'index.html';");
        }

        if (request == 'presFetchSuccess') {
          var data = JSON.parse(decodeURI(windowObject.valueForKey("SSData")));
          self.configs = self.setConfigs({ presentation: data });
          windowObject.evaluateWebScript("_presFetchSuccess()");
        }

        if (request == 'presFetchError') {
          windowObject.evaluateWebScript("_presFetchError()");
        }

        if (request == 'updatePreferences') {
          var preferences = JSON.parse(decodeURI(windowObject.valueForKey("preferences")));
          self.configs = self.setConfigs({ preferences: preferences });
        }

        if (request == 'startSync') {
          var data = JSON.parse(decodeURI(windowObject.valueForKey("SSData")));
          var files = SS.getAllFilesForUpload(data.selectedArtboards);
          if (files.length > 0 ) {
            SS.frameWork.syncToSlides_allFiles_webView(data.presentationId, files, webView);
          } else {
            windowObject.evaluateWebScript('_artBoardsMissing();');
          }
        }

        if (request == 'onWindowDidBlur') {
          SS.addFirstMouseAcceptor(webView, contentView);
        }

        if (request == "close") {
          if (!options.floatWindow) {
            Panel.orderOut(nil);
            NSApp.stopModal();
          }
          else {
            Panel.close();
          }
        }

        if (request == "focus") {
          var point = Panel.currentEvent().locationInWindow(),
            y = NSHeight(Panel.frame()) - point.y - 32;
          windowObject.evaluateWebScript("lookupItemInput(" + point.x + ", " + y + ")");
        }
        windowObject.evaluateWebScript("window.location.hash = '';");
      })
    });

    webView.setFrameLoadDelegate_(delegate.getClassInstance());
    // NSButton already returns YES for -acceptsFirstMouse: so all we need to do
    // is handle the mouseDown event.
    if (options.floatWindow) {
      Panel.center();
      Panel.makeKeyAndOrderFront(nil);
    }

    var closeButton = Panel.standardWindowButton(NSWindowCloseButton);
    closeButton.setCOSJSTargetFunction(function (sender) {
      var request = NSURL.URLWithString(webView.mainFrameURL()).fragment();

      if (options.floatWindow && request == "submit") {
        data = JSON.parse(decodeURI(windowObject.valueForKey("MDData")));
        options.callback(data);
      }

      if (options.identifier) {
        threadDictionary.removeObjectForKey(options.identifier);
      }

      self.wantsStop = true;
      if (options.floatWindow) {
        Panel.close();
      }
      else {
        Panel.orderOut(nil);
        NSApp.stopModal();
      }

    });
    closeButton.setAction("callAction:");

    var titlebarView = contentView.superview().titlebarViewController().view(),
      titlebarContainerView = titlebarView.superview();
    closeButton.setFrameOrigin(NSMakePoint(8, 8));
    titlebarContainerView.setFrame(NSMakeRect(0, options.height, options.width, 32));
    titlebarView.setFrameSize(NSMakeSize(options.width, 32));
    titlebarView.setTransparent(true);
    titlebarView.setBackgroundColor(titleBgColor);
    titlebarContainerView.superview().setBackgroundColor(titleBgColor);

    if (!options.floatWindow) {
      NSApp.runModalForWindow(Panel);
    }

    return result;
  }

});
