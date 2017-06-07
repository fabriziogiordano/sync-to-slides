// export.js
SS.extend({
    exportImage: function (artboard) {

        var exportSize = 3;

        if (this.configs.preferences && this.configs.preferences.exportSize) {
            exportSize = this.configs.preferences.exportSize;
        }

        var options = {
                layer: artboard,
                path: this.toJSString(NSTemporaryDirectory()),
                scale: exportSize,
                name: artboard.objectID(),
                prefix: "",
                suffix: "",
                format: "png"
            },
            document = this.document,
            slice = MSExportRequest.exportRequestsFromExportableLayer(options.layer).firstObject(),
            savePathName = [];

        slice.scale = options.scale;
        slice.format = options.format;

        savePathName.push(
                options.path,
                "/",
                options.prefix,
                options.name,
                options.suffix,
                ".",
                options.format
            );
        savePathName = savePathName.join("");

        document.saveArtboardOrSlice_toFile(slice, savePathName);

        return savePathName;
    },
    allCount: 0,
    getSelectedArtboards: function (selectedIds) {
      var doc = SS.document;
      var currentPage = SS.page;
      var selectedArtboards = [];
      var artboards = currentPage.artboards();

      for (var i = 0; i < selectedIds.length; i++){
          for (var a = 0; a < artboards.length; a++) {
            var artboard = artboards[a],
                objectID = artboard.objectID();
            if(objectID == selectedIds[i]) {
                self.allCount += artboard.children().count();
                selectedArtboards[i] = artboard;
            }
        }
      }

      return selectedArtboards;
    },
    getAllFilesForUpload: function (selectedIds) {
      var doc = SS.document;
      var currentPage = SS.page;
      var outputFilenames = [];
      var artboards = currentPage.artboards();
      var count = artboards.count();

      var selectedArtboards = this.getSelectedArtboards(selectedIds);

        for (var a = 0; a < selectedArtboards.length; a++) {
          var artboardRect = selectedArtboards[a].absoluteRect();
          outputFilenames.push({
            fileId: selectedArtboards[a].objectID(),
            fileURL: this.exportImage(selectedArtboards[a]),
            rect: this.rectToJSON(artboardRect, artboardRect),
            layers: SS.getLayersFromArtboard(selectedArtboards[a]),
            fileIndex: a + 1
          });
        }

      return outputFilenames;
    },
    hasExportSizes: function(layer){
        return layer.exportOptions().exportFormats().count() > 0;
    },
    hasEmoji: function(layer) {
      var fonts = layer.attributedString().fontNames().allObjects();
      return !!/AppleColorEmoji/.exec(fonts);
    },
    isSliceGroup: function(layer) {
        return this.is(layer, MSLayerGroup) && this.hasExportSizes(layer);
    },
    isExportable: function(layer) {
        return this.is(layer, MSTextLayer) ||
               this.is(layer, MSShapeGroup) ||
               this.is(layer, MSBitmapLayer) ||
               this.is(layer, MSSliceLayer) ||
               this.is(layer, MSSymbolInstance) ||
               this.isSliceGroup(layer)
    },
    getStates: function(layer){
        var isVisible = true,
            isLocked = false,
            hasSlice = false,
            isEmpty = false,
            isMaskChildLayer = false,
            isMeasure = false;

        while (!( this.is(layer, MSArtboardGroup) || this.is(layer, MSSymbolMaster) ) ) {
            var group = layer.parentGroup();

            if (!group) { break; }

            if (!layer.isVisible()) {
                isVisible = false;
            }

            if (layer.isLocked()) {
                isLocked = true;
            }

            if ( this.is(group, MSLayerGroup) && this.hasExportSizes(group) ) {
                hasSlice = true
            }

            if (
                this.maskObjectID &&
                group.objectID() == this.maskObjectID &&
                !layer.shouldBreakMaskChain()
            ) {
                isMaskChildLayer = true
            }

            if (
                this.is(layer, MSTextLayer) &&
                layer.isEmpty()
            ) {
                isEmpty = true
            }

            layer = group;
        }
        return {
            isVisible: isVisible,
            isLocked: isLocked,
            hasSlice: hasSlice,
            isMaskChildLayer: isMaskChildLayer,
            isMeasure: isMeasure,
            isEmpty: isEmpty
        }
    },
    getMask: function(group, layer, layerData, layerStates){
        if(layer.hasClippingMask()){
            if(layerStates.isMaskChildLayer){
                this.maskCache.push({
                    objectID: this.maskObjectID,
                    rect: this.maskRect
                });
            }
            this.maskObjectID = group.objectID();
            this.maskRect = layerData.rect;
        }
        else if( !layerStates.isMaskChildLayer && this.maskCache.length > 0 ){
            var mask = this.maskCache.pop();
            this.maskObjectID = mask.objectID;
            this.maskRect = mask.rect;
            layerStates.isMaskChildLayer = true;
        }
        else if ( !layerStates.isMaskChildLayer ) {
            this.maskObjectID = undefined;
            this.maskRect = undefined;
        }

        if (layerStates.isMaskChildLayer){
            var layerRect = layerData.rect,
                maskRect = this.maskRect;

            layerRect.maxX = layerRect.x + layerRect.width;
            layerRect.maxY = layerRect.y + layerRect.height;
            maskRect.maxX = maskRect.x + maskRect.width;
            maskRect.maxY = maskRect.y + maskRect.height;

            var distance = this.getDistance(layerRect, maskRect),
                width = layerRect.width,
                height = layerRect.height;

            if(distance.left < 0) width += distance.left;
            if(distance.right < 0) width += distance.right;
            if(distance.top < 0) height += distance.top;
            if(distance.bottom < 0) height += distance.bottom;

            layerData.rect = {
                    x: ( distance.left < 0 )? maskRect.x: layerRect.x,
                    y: ( distance.top < 0 )? maskRect.y: layerRect.y,
                    width: width,
                    height: height
                }

        }
    },
    getFormats: function( exportFormats ) {
      var formats = [];
      for (var i = 0; i < exportFormats.length; i++) {
        var format = exportFormats[i],
            prefix = "",
            suffix = "";

        if(format.namingScheme){
          if(format.namingScheme()){
            prefix = format.name();
          }
          else{
            suffix = format.name();
          }
        }
        else{
          suffix = format.name();
        }

        formats.push({
          scale: format.scale(),
          prefix: prefix,
          suffix: suffix,
          format: format.fileFormat()
        })
      }
      return formats;
    },
    isIgnored: function (layer) {
        if (layer.name().startsWith('__') || layer.parentGroup().name().startsWith('__')) {
          return true;
        } else {
          return false;
        }
    },
    getExportable: function(layer, savePath){
        var self = this,
            exportable = [],
            size, sizes = layer.exportOptions().exportFormats(),
            fileFormat = this.toJSString(sizes[0].fileFormat()),
            matchFormat = /png|jpg|tiff|webp/.exec(fileFormat);
        var exportFormats =
            (self.configs.unit == "dp/sp" && matchFormat)? [
              { scale: 1 / self.configs.scale, prefix: "drawable-mdpi/", format: "png" },
              { scale: 1.5 / self.configs.scale, prefix: "drawable-hdpi/", format: "png" },
              { scale: 2 / self.configs.scale, prefix: "drawable-xhdpi/", format: "png" },
              { scale: 3 / self.configs.scale, prefix: "drawable-xxhdpi/", format: "png" },
              { scale: 4 / self.configs.scale, prefix: "drawable-xxxhdpi/", format: "png" }
            ]:
            (this.configs.unit == "pt" && matchFormat)? [
              { scale: 1 / self.configs.scale, suffix: "", format: "png" },
              { scale: 2 / self.configs.scale, suffix: "@2x", format: "png" },
              { scale: 3 / self.configs.scale, suffix: "@3x", format: "png" }
            ]:
            self.getFormats(sizes);

        for(exportFormat of exportFormats) {
          var prefix = exportFormat.prefix || "",
              suffix = exportFormat.suffix || "";
          self.exportImage({
                  layer: layer,
                  path: self.assetsPath,
                  scale: exportFormat.scale,
                  name: layer.name(),
                  prefix: prefix,
                  suffix: suffix,
                  format: exportFormat.format
              });

          exportable.push({
                  name: self.toJSString(layer.name()),
                  format: fileFormat,
                  path: prefix + layer.name() + suffix + "." + exportFormat.format
              });
        }

        return exportable;
    },
    getSlice: function(layer, layerData, symbolLayer){
        var objectID = ( layerData.type == "symbol" )? this.toJSString(layer.symbolMaster().objectID()):
                        ( symbolLayer )? this.toJSString(symbolLayer.objectID()):
                        layerData.objectID;
        if(
            (
                layerData.type == "slice" ||
                (
                    layerData.type == "symbol" &&
                    this.hasExportSizes(layer.symbolMaster())
                )
            ) &&
            !this.sliceCache[objectID]
        ){
            var sliceLayer = ( layerData.type == "symbol" )? layer.symbolMaster(): layer;
            if(symbolLayer && this.is(symbolLayer.parentGroup(), MSSymbolMaster)){
                layer.exportOptions().setLayerOptions(2);
            }

            // this.assetsPath = this.savePath + "/assets";
            // NSFileManager
            //     .defaultManager()
            //     .createDirectoryAtPath_withIntermediateDirectories_attributes_error(this.assetsPath, true, nil, nil);

            // this.sliceCache[objectID] = layerData.exportable = this.getExportable(sliceLayer);
            this.slices.push({
                name: layerData.name,
                objectID: objectID,
                rect: layerData.rect
                // exportable: layerData.exportable
            })
        }
        else if( this.sliceCache[objectID] ){
            layerData.exportable = this.sliceCache[objectID];
        }
    },
    getSymbol: function(layer, artboard){
        var self = this,
            layers = [],
            allSymbolLayers = [],
            symbolObjectID = this.toJSString(layer.symbolMaster().objectID());

        if( !self.hasExportSizes(layer.symbolMaster()) && layer.symbolMaster().children().count() > 1 ){
            var  symbolChildren = layer.symbolMaster().children(),
                tempSymbol = layer.duplicate(),
                tempGroup = tempSymbol.detachByReplacingWithGroup();
                tempParentGroup = layer.parentGroup();
                tempGroup.resizeToFitChildrenWithOption(0)

                var tempSymbolLayers = tempGroup.children()
                    overrides = layer.overrides();

                overrides = (overrides) ? overrides.objectForKey(0) : undefined;

                for (var k = 0; k < tempSymbolLayers.count(); k++ ) {
                    var tempSymbolLayer = tempSymbolLayers[k];
                    if( self.is(tempSymbolLayer, MSSymbolInstance) ){
                        var symbolMasterObjectID = self.toJSString(symbolChildren[k].objectID());
                        if(
                          overrides &&
                          overrides[symbolMasterObjectID] &&
                          !!overrides[symbolMasterObjectID].symbolID
                        ){
                          var changeSymbol = self.find({key: "(symbolID != NULL) && (symbolID == %@)", match: self.toJSString(overrides[symbolMasterObjectID].symbolID)}, self.document.documentData().allSymbols());
                          if(changeSymbol){
                            tempSymbolLayer.changeInstanceToSymbol(changeSymbol);
                          }
                          else{
                            tempSymbolLayer = undefined;
                          }
                        }
                    }

                    if (tempSymbolLayer && SS.is(tempSymbolLayer, MSSymbolInstance)) {
                        var symbolLayers = SS.getSymbol(tempSymbolLayer, artboard);
                        for (var j = 0; j < symbolLayers.length; j++) {
                            allSymbolLayers.push(symbolLayers[j]);
                        }
                    } else if(tempSymbolLayer) {
                        allSymbolLayers.push(tempSymbolLayer);
                    }
                }

            this.layersToRemove.push(tempGroup);
        }


        return allSymbolLayers;
    },
    layersToRemove: [],
    getLayersFromArtboard: function (artboard) {
        var allLayers = artboard.children(),
            dataToExport = [];

        if (this.configs.preferences && this.configs.preferences.exportLayers && this.configs.preferences.exportLayers == 2) {
            return {};
        }

        for (var j = 0; j < allLayers.count(); j++) {

            this.maskCache = [];
            this.maskCache = [];
            this.maskObjectID = undefined;
            this.maskRect = undefined;

            var layer = allLayers[j];

            if (!layer) { continue; }

            var artboardRect = artboard.absoluteRect(),
                group = layer.parentGroup(),
                layerStates = this.getStates(layer);

            if (
                this.isIgnored(layer) ||
                !this.isExportable(layer) ||
                !layerStates.isVisible ||
                allLayers[j].class() == 'MSArtboardGroup' ||
                ( layerStates.isLocked && !this.is(layer, MSSliceLayer) ) ||
                layerStates.isEmpty ||
                layerStates.hasSlice ||
                layerStates.isMeasure
            ) {
                continue;
            }

            var layerType = this.is(layer, MSTextLayer) ? "text" :
                            this.is(layer, MSSymbolInstance) ? "symbol" :
                            this.is(layer, MSSliceLayer) || this.hasExportSizes(layer) ? "slice" : "shape";

            if (layerType == 'symbol') {
                var symbolLayersData = this.getSymbolLayersData(layer, artboard);
                this.removeLayersToRemove();
                dataToExport = dataToExport.concat(symbolLayersData);
            } else {
                var layerData = SS.getLayersSpec(layer, artboard);
                dataToExport.push(layerData);
            }
      }

      return dataToExport;
    },
    removeLayersToRemove: function () {
        for (var i = 0; i < this.layersToRemove.length; i++) {
            this.removeLayer(this.layersToRemove[i]);
        }
    },
    getSymbolLayersData: function (symbolLayer, artboard) {

        var symbolLayers = this.getSymbol(symbolLayer, artboard),
            symbolLayersData = [];

        for (var i = 0; i < symbolLayers.length; i++) {
            var layer = symbolLayers[i];

            var layerStates = this.getStates(layer);

            var layerType = this.is(layer, MSTextLayer) ? "text" :
                    this.is(layer, MSSymbolInstance) ? "symbol" :
                    this.is(layer, MSSliceLayer) || this.hasExportSizes(layer) ? "slice" : "shape";

            if (
                !this.isExportable(layer) ||
                !layerStates.isVisible ||
                layer.class() == 'MSArtboardGroup' ||
                ( layerStates.isLocked && !this.is(layer, MSSliceLayer) ) ||
                layerStates.isEmpty ||
                layerStates.hasSlice ||
                layerStates.isMeasure
            ) {
                continue;
            }

            layer.setName("___symbol___" + symbolLayer.objectID() + "_" + i);

            symbolLayersData.push(SS.getLayersSpec(layer, artboard));
        }

        return symbolLayersData;
    },
    getLayersSpec: function (layer, artboard) {
        var artboardRect = artboard.absoluteRect(),
            exportLayerRect = layer.absoluteRect(),
            group = layer.parentGroup(),
            layerStates = this.getStates(layer);

        var objId = this.toJSString( layer.objectID() );

        if(layer.name().startsWith('___symbol___')) {
          objId = this.toJSString( layer.name().replace('___symbol___', '') );
        }

        var layerData = {
          objectID: objId,
          parentID: this.toJSString( artboard.objectID()),
          name: this.toHTMLEncode(this.emojiToEntities(layer.name())),
          parentRect: this.rectToJSON(artboardRect, artboardRect),
          rect: this.rectToJSON(exportLayerRect, artboardRect)
        };

        this.getMask(group, layer, layerData, layerStates);

      return layerData
    },
    getAllArtboardsData: function () {
        var self = this;
        this.artboardsData = [];
        this.selectionArtboards = {};
        var data = {};
        data.selection = [];
        data.current = [];
        data.pages = [];

        // data.exportOption = self.configs.exportOption;
        if(data.exportOption == undefined){
            data.exportOption = true;
        }

        // data.exportInfluenceRect = self.configs.exportInfluenceRect;
        if(data.exportInfluenceRect == undefined){
            data.exportInfluenceRect = false;
        }

        // self.configs.order = (self.configs.order)? self.configs.order: "positive";
        // data.order = self.configs.order;

        data.order = "positive";

        if(this.selection.count() > 0){
            var selectionArtboards = this.find({key: "(class != NULL) && (class == %@)", match: MSArtboardGroup}, this.selection, true);
            if(selectionArtboards.count() > 0){
                selectionArtboards = selectionArtboards.objectEnumerator();
                while(artboard = selectionArtboards.nextObject()){
                    data.selection.push(this.toJSString(artboard.objectID()));
                }
            }
        }
        if(this.artboard) data.current.push(this.toJSString(this.artboard.objectID()));

        // var pages = this.document.pages().objectEnumerator();
        // var pages = this.
        // while(page = pages.nextObject()){
            var page = this.page;
            var pageData = {},
                artboards = page.artboards().objectEnumerator();
            pageData.name = this.toJSString(page.name());
            pageData.objectID = this.toJSString(page.objectID());
            pageData.artboards = [];

            while(artboard = artboards.nextObject()){
                // if(!this.is(artboard, MSSymbolMaster)){
                    var artboardData = {};
                    artboardData.name = this.toJSString(artboard.name());
                    artboardData.objectID = this.toJSString(artboard.objectID());
                    artboardData.MSArtboardGroup = artboard;
                    pageData.artboards.push(artboardData);
                // }
            }
            pageData.artboards.reverse()
            data.pages.push(pageData);
        // }

            return data;
    },

    exportPanel: function(isAuthorized) {

        var data = SS.getAllArtboardsData();
        self.allData = data;

        var url = isAuthorized ? "index.html" : "login.html";

        return this.SSPanel({
            url: this.pluginSketch + "/panel/" + url,
            width: 320,
            height: 500,
            data: data,
            identifier: 'com.google.sketch.slides',
            floatWindow: true,
            callback: {},
        });
    }
});



