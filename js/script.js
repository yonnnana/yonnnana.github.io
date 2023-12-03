/***************** Smooth scroll ******************/

$(function(){
	$('a[href^="#"]').click(function(){
		var speed = 500;
		var href= $(this).attr("href");
		var target = $(href == "#" || href == "" ? 'html' : href);
		var position = target.offset().top;
		$("html, body").animate({scrollTop:position}, speed, "swing");
		return false;
	});
});

/***************** Drawer MENU 閉じる ******************/

$('main').click(function(){
$('.offcanvas-collapse').removeClass('open');
});

$(".nav-link").click(function(){
  $('.offcanvas-collapse').removeClass('open');
});

/***************** オフキャンバス ******************/

$(function () {
  'use strict'

  $('[data-toggle="offcanvas"]').on('click', function () {
    $('.offcanvas-collapse').toggleClass('open')
  })
})