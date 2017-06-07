// var button = document.getElementById('syncToSlides');

var init = function (data) {
  window.data = data;
  window.dataCopy = JSON.parse(JSON.stringify(data));
  _renderTemplate(data);
}

var _renderTemplate = function (data) {
  var html = "";
  $('.panel-table-body').html("");
  for (var i = 0; i < data.pages.length; i++) {
    $('#pageName').text(data.pages[i].name);
    for (var j = 0; j < data.pages[i].artboards.length; j++) {
      var a = data.pages[i].artboards[j];
      html += _rowHTML(a);
    }
  }
  $('.panel-table-body').html(html);
}

var _rowHTML = function (artboard) {
  var isChecked = artboard.selected ? ' checked ' : '';
  var template =
    '<div class="panel-row a-'+ artboard.objectID + '">'+
    '<label class="control control--checkbox">' + artboard.name +
    '<input type="checkbox"' + isChecked + 'class="artboard-check" id="'+ artboard.objectID + '" />' +
    '<div class="control__indicator"></div>' +
    '</label><div class="spinner"><img class="done-img hide" src="assets/img/done.svg"/><img class="spinner-img hide" src="assets/img/spinner.svg"/></div></div>';
  return template;
}

var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

var _refreshArtboards = function () {
  window.location.hash = 'refreshArtboards';
  $('#toggleSelectAll').prop('checked', false);
  _tost('💆🏼  Refreshed!')
}

var _tost = function (msg) {
  tost.text(msg);
  tost.stop().fadeIn('fast').delay(1000).fadeOut('fast');
}

var _handleChangeURL = function (e) {
  $('#loading').show();
  delay(function(){
    var d = {
      presentationId: document.getElementById('slidesURL').value
    }
    window.SSData = encodeURI(JSON.stringify(d));
    window.location.hash = 'fetchPresentation';
  }, 300);
}

var _onLoad = function () {

  $("time.timeago").timeago();

  if (window.currentPresentation && window.currentPresentation.name) {
    _presFetchSuccess();
  } else {
    $('#overlay').show();
  }

  if (window.currentPresentation && window.lastUpdated) {
    _m('Last synced ');
    $("time.timeago").timeago("update", new Date(lastUpdated));
  }

  $('.ver').text("v" + window.version);

}

var _presFetchSuccess = function (e) {
  _m('');
  $("time.timeago").text('');
  $('#loading').hide();
  $('#overlay').fadeOut('fast');
  $('.panel-title h1').text(currentPresentation.name)
  $('#slidesURL').val(currentPresentation.id);
  $('.panel-title').removeClass('hide');
  $('.panel-input').addClass('hide');
}

var _uploadProgress = function () {

}

var _presFetchError = function (e) {
  $('#loading').hide();
}

var _removePresentation = function () {
  $('.panel-title h1').text('')
  $('.panel-title').addClass('hide');
  $('.panel-input').removeClass('hide');
  $('#slidesURL').val(null);
  $('#overlay').fadeIn('fast');
}

var _toggleSelectAll = function () {
  $('.artboard-check:checkbox').not(this).prop('checked', this.checked);
  for (var j = 0; j < data.pages[0].artboards.length; j++) {
    data.pages[0].artboards[j].selected = $(this).is(':checked');
    dataCopy.pages[0].artboards[j].selected = $(this).is(':checked');
  }

  _checkEnabledButton();
}

var _checkToggleAllState = function () {
  $('#toggleSelectAll').prop('indeterminate', true);

  for (var j = 0; j < data.pages[0].artboards.length; j++) {
    if (data.pages[0].artboards[j].objectID == this.id) {
      data.pages[0].artboards[j].selected = $(this).is(':checked');
    }
  }

  for (var j = 0; j < dataCopy.pages[0].artboards.length; j++) {
    if (dataCopy.pages[0].artboards[j].objectID == this.id) {
      dataCopy.pages[0].artboards[j].selected = $(this).is(':checked');
    }
  }

  _checkEnabledButton();
}

var _checkEnabledButton = function () {
  var len = $('.artboard-check:checked').length;
  if (len > 0) {
    $('#syncToSlides').prop('disabled', false);
  } else {
     $('#syncToSlides').prop('disabled', true);
  }
}

var _getSelectedArtboards = function () {
  var selectedArtboards = [];
  $('.artboard-check:checked').each(function () {
    selectedArtboards.push(this.id);
  })
  return selectedArtboards;
}

var _showLoader = function () {
  $('#loading').show();
  $('.overlay').show();
}

var _hideLoader = function () {
  $('#loading').hide();
  $('.overlay').hide();
  $('.done-img').fadeOut('slow');
}

var _uploadComplete = function () {
  _hideLoader();
  _m('Last synced ')
  var d = new Date();
  $("time.timeago").timeago("update", new Date());
  $('.spinner-img').hide();
  window.lastUpdated = encodeURI(JSON.stringify(new Date()));
  window.location.hash = "lastUpdated";
}

var _showSpinners = function () {
  $('.artboard-check:checked').parents('.panel-row').find('.spinner-img').show();
}

var _hideSpinner = function (id) {
  $(".a-" + id ).find('.spinner-img').hide();
  $(".a-" + id ).find('.done-img').show();
}

var _showError = function (code) {
  $('#loading').hide();
  _m('Failed to fetch!');
  $('.spinner-img').hide();
  if (code == '403') {
    _m("🙅 You don't have permission!");
    $('#removeButton').trigger('click');
  } else if (code == '404') {
    _m("😶 Can't find the presentation!");
  } else if (code == '401') {
    _m("👻 You shall not pass!");
  }

  $("time.timeago").text('');
}

var _m = function (m) {
  $('.message').text(m);
}

var _artBoardsMissing = function () {
  $('#loading').hide();
  $('.spinner-img').hide();
  _m('😓 Restart plugin to sync!');
}

var _uploadToSlides = function () {

  $('#loading').show();
  _m('💪🏽 Processing layers...');
  $("time.timeago").text('');
  _showSpinners();
  var d = {
      presentationId: document.getElementById('slidesURL').value,
      selectedArtboards: _getSelectedArtboards()
    }

  ga('send', 'event', 'sync panel', 'artboards', d.selectedArtboards.length);
  window.SSData = encodeURI(JSON.stringify(d));
  window.location.hash = 'startSync';
}

var _sort = function (sortOrder) {
  data.pages[0].artboards.sort(_sortByName);

  switch (sortOrder) {
    case 'none':
      data = JSON.parse(JSON.stringify(dataCopy));
      break;
    case 'reverse':
      data = JSON.parse(JSON.stringify(dataCopy));
      data.pages[0].artboards.reverse();
      break;
    case 'alphabetical':
      data.pages[0].artboards.sort(_sortByName);
      break;
    case 'reverse-alphabetical':
      data.pages[0].artboards.sort(_sortByNameReverse);
      break;
    default:
  }

  _renderTemplate(data);
}

var _sortByNameReverse = function (a, b) {
  var aName = a.name.toLowerCase();
  var bName = b.name.toLowerCase();
  return ((aName > bName) ? -1 : ((aName < bName) ? 1 : 0));
}

var _sortByName = function(a, b){
  var aName = a.name.toLowerCase();
  var bName = b.name.toLowerCase();
  return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
}

var _showDropdown = function (e) {
  $(this).next('.dropdown').toggleClass('active');
}

var _chooseSortOrder = function () {
  var sortOrder = $(this).data('value');
  $('.selectedOrder').attr('src', 'assets/img/' + sortOrder + '.svg');
  $('.dropdown').removeClass('active');
  _sort(sortOrder);
}

jQuery(document).ready(function() {
  $("time.timeago").timeago();
  window.tost = $('.tost');
});

var _showSettingsModal = function () {
  window.location.hash = "fetchUser";
  $('.settings-overlay').fadeIn('fast');
  $('.settings').fadeIn('medium');
  if (preferences) {
    if(preferences.exportSize) $('#exportSize').val(preferences.exportSize);
    if(preferences.exportLayers) $('#exportLayers').val(preferences.exportLayers);
  }
}

var _hideSettingsModal = function () {
  $('.settings-overlay').fadeOut('fast');
  $('.settings').fadeOut('fast');
}

var _signOut = function () {
  window.location.hash = 'signOut';
}

var _openUrl = function (e) {
  e.preventDefault();
  window.Link = encodeURI(JSON.stringify($(this).attr('href')));
  window.location.hash = 'openLink';
}

var _openPresentation = function (e) {
  e.preventDefault();
  var link = "https://docs.google.com/presentation/d/" + currentPresentation.id;
  window.Link = encodeURI(JSON.stringify(link));
  window.location.hash = 'openLink';
}

var _updateUser = function () {
  $('.username').text(currentUser.name);
  $('.email').text(currentUser.email);
}

var _updatePreferences = function () {
  var preferences = {
    exportSize: $('#exportSize').val(),
    exportLayers: $('#exportLayers').val(),
  };

  window.preferences = encodeURI(JSON.stringify(preferences));
  window.location.hash = 'updatePreferences';
}

var _fileDeleteFailed = function() {
  $('time').text('');
}

var _checkUpdates = function () {
  var timestamp = new Date().getTime();
  $.getJSON('https://raw.githubusercontent.com/websiddu/versions/master/sync-to-slides.json?t='+timestamp, function (data) {
    if (window.version && parseFloat(window.version) < parseFloat(data.version)) {
      $('.updates').show();
    }
  })
}

window.oncontextmenu = function (evt) {
  if (!evt.altKey) {
    evt.preventDefault();
  }
};

$(document).on('keyup', '#slidesURL', _handleChangeURL);
$(document).on('click', '#removeButton', _removePresentation);
$(document).on('change', '#toggleSelectAll', _toggleSelectAll)
$(document).on('change', '.artboard-check', _checkToggleAllState);
$(document).on('click', '#syncToSlides', _uploadToSlides);
$(document).on('click', '#sortDropdown', _showDropdown);
$(document).on('click', '.dropdown-option', _chooseSortOrder);
$(document).on('click', '.settings-button', _showSettingsModal);
$(document).on('click', '.settings-overlay', _hideSettingsModal);
$(document).on('click', '.settings-done', _hideSettingsModal);
$(document).on('click', '.signout', _signOut);
$(document).on('click', '.link', _openUrl);
$(document).on('click', '.linkToSlides', _openPresentation);
$(document).on('click', '.updates a', _openUrl);
$(document).on('change', '#exportSize', _updatePreferences);
$(document).on('change', '#exportLayers', _updatePreferences);
$(document).on('click', '#refreshArtboards', _refreshArtboards);
$(document).ready(function () { _checkUpdates() });
