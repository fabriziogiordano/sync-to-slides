$(function () {

  var iframe = $('<iframe class="video" src="https://www.youtube-nocookie.com/embed/UpzLCkx2_7U?autoplay=1&rel=0&amp;controls=0&amp;showinfo=0" frameborder="0" allowfullscreen></iframe>')

  var getSize = function () {
    return {
      width: $(window).innerWidth() - 200,
      height: $(window).innerHeight() - 100
    }
  }

  iframe.css({ width: $(window).innerWidth() - 200 + 'px', height: $(window).innerHeight() - 100 + 'px' });

  // If you want to keep full screen on window resize
  $(window).resize(function(){
    iframe.css({ width: $(window).innerWidth() - 200 + 'px', height: $(window).innerHeight() - 100 + 'px' });
  });


  $('#watch').on('click', function () {
    $('.dialog').toggleClass('hide');
    $('.video').html(iframe);
  });

  $('.close').on('click', function () {
    $('.dialog').toggleClass('hide');
    $('.video').html('');
  });


$(document).keyup(function(e) {
     if (e.keyCode == 27) { // escape key maps to keycode `27`
       $('.dialog').attr('class', 'dialog hide');
       $('.video').html('');
    }
});

});
