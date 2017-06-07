SS.extend({
    openURL: function(url){
        var nsurl = NSURL.URLWithString(url + '?ref=ssp');
        NSWorkspace.sharedWorkspace().openURL(nsurl)
    },
    mathHalf: function(number){
        return Math.round( number / 2 );
    },
    convertUnit: function(length, isText, percentageType){
        if(percentageType && this.artboard){
            var artboardRect = this.getRect( this.artboard );
            if (percentageType == "width") {
                 return Math.round((length / artboardRect.width) * 1000) / 10 + "%";

            }
            else if(percentageType == "height"){
                return Math.round((length / artboardRect.height) * 1000) / 10 + "%";
            }
        }

        var length = Math.round( length / this.configs.scale * 10 ) / 10,
            units = this.configs.unit.split("/"),
            unit = units[0];

        if( units.length > 1 && isText){
            unit = units[1];
        }

        return length + unit;
    },
    toHex:function(c) {
        var hex = Math.round(c).toString(16).toUpperCase();
        return hex.length == 1 ? "0" + hex :hex;
    },
    hexToRgb:function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: this.toHex(result[1]),
            g: this.toHex(result[2]),
            b: this.toHex(result[3])
        } : null;
    },
    isIntersect: function(targetRect, layerRect){
        return !(
            targetRect.maxX <= layerRect.x ||
            targetRect.x >= layerRect.maxX ||
            targetRect.y >= layerRect.maxY ||
            targetRect.maxY <= layerRect.y
        );
    },
    getDistance: function(targetRect, containerRect){
        var containerRect = containerRect || this.getRect(this.current);

        return {
            top: (targetRect.y - containerRect.y),
            right: (containerRect.maxX - targetRect.maxX),
            bottom: (containerRect.maxY - targetRect.maxY),
            left: (targetRect.x - containerRect.x),
        }
    },
    message: function(message){
        this.document.showMessage(message);
    },
    find: function(format, container, returnArray){
        if(!format || !format.key  || !format.match){
            return false;
        }
        var predicate = NSPredicate.predicateWithFormat(format.key,format.match),
            container = container || this.current,
            items;

        if(container.pages){
            items = container.pages();
        }
        else if( this.is( container, MSSharedStyleContainer ) || this.is( container, MSSharedTextStyleContainer ) ){
            items = container.objectsSortedByName();
        }
        else if( container.children ){
            items = container.children();
        }
        else{
            items = container;
        }

        var queryResult = items.filteredArrayUsingPredicate(predicate);

        if(returnArray) return queryResult;

        if (queryResult.count() == 1){
            return queryResult[0];
        } else if (queryResult.count() > 0){
            return queryResult;
        } else {
            return false;
        }
    },
    clearAllMarks: function(){
        var layers = this.page.children().objectEnumerator();
        while(layer = layers.nextObject()) {
            if(this.is(layer, MSLayerGroup) && this.regexNames.exec(layer.name())){
                this.removeLayer(layer)
            }
        }
    },
    toggleHidden: function(){
        var isHidden = (this.configs.isHidden)? false : !Boolean(this.configs.isHidden);
        this.configs = this.setConfigs({isHidden: isHidden});

        var layers = this.page.children().objectEnumerator();

        while(layer = layers.nextObject()) {
            if(this.is(layer, MSLayerGroup) && this.regexNames.exec(layer.name())){
                layer.setIsVisible(!isHidden);
            }
        }
    },
    toggleLocked: function(){
        var isLocked = (this.configs.isLocked)? false : !Boolean(this.configs.isLocked);
        this.configs = this.setConfigs({isLocked: isLocked});

        var layers = this.page.children().objectEnumerator();

        while(layer = layers.nextObject()) {
            if(this.is(layer, MSLayerGroup) && this.regexNames.exec(layer.name())){
                layer.setIsLocked(isLocked);
            }
        }
    },
});
