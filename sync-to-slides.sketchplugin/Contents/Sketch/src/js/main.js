SS['Sync'] = function () {

  var _showPanel = function () {
    SS['frameWork'] = SS.initFramework(SS.context, 'SyncToSlides');
    SS.frameWork.setWebView(SS.webView);
    var isAuthorized = SS.frameWork.isAuthorized();
    SS.exportPanel(isAuthorized);
  }

  return {
    showPanel: _showPanel
  }
}
