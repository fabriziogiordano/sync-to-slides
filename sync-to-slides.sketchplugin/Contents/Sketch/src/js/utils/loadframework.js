SS.extend({
  initFramework: function (context, frameworkName) {
    var scriptPath = context.scriptPath;
    var pluginRoot = [scriptPath stringByDeletingLastPathComponent];

    // pluginRoot = "/Users/gsid/Library/Developer/Xcode/DerivedData/SyncToSlides-atkpidlwzafjlvhhxhpshvcdnlnx/Build/Products/Debug/";

    var mocha = [Mocha sharedRuntime];
    if (NSClassFromString(frameworkName) == null) {
      if (![mocha loadFrameworkWithName:frameworkName inDirectory:pluginRoot]) {
        log('An error ocurred while loading the SketchSlides Framework.');
        return;
      }
    }
    return [[ServiceManager alloc] init];
  }
});
