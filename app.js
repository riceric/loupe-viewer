/**
 * Loupe viewer, designed for viewing and magnifying a set of product images
 * Require JQuery, SlickJS
 */
var Loupe = (function() {
    // Module settings
    var settings = {
        videoSlide: $('.loupe__slide--video'),
        navItem: $('.loupe-nav__item'),

    }

    /* TODO figure out how to store Scene7 parameters */
    var dimParamDefault = '?wid=675&hei=675';
    var dimParamHQ = '?wid=1280&hei=1280';

    /**
     * Activate 'magnifying glass' effect.
     * Pre-requisite: HTML must follow a template
     * @access public
     * @param {String} selector DOM selector containing loupe images
     */
    var magnify = function(selector) {
      $(selector).on({
        click: function() {
            var imgURI = $(this).data('lgimg');
            $(this).css('background-image','url('+imgURI+')');
            $(this).toggleClass('is-active');
        },
        mousemove: function(e) {
          if ($(this).hasClass('is-active')) {
            var magnified = e.currentTarget;
            e.offsetX ? offsetX = e.offsetX : offsetX = e.touches[0].pageX;
            e.offsetY ? offsetY = e.offsetY : offsetX = e.touches[0].pageX;
            x = offsetX/magnified.offsetWidth*100;
            y = offsetY/magnified.offsetHeight*100;
            magnified.style.backgroundPosition = x + '% ' + y + '%';
          }
        },
        mouseleave: function() {
          $(this).removeClass('is-active');
        }

      });
    };

    /**
     * Load carousel with image viewers; Sets up two carousels: 1) Main images 2) Navigation for images
     * @access public
     * @param {String} imgData JSON data containing image URLs
     * @param {String} slidesSelector Selector that contains carousel slickjs slides
     * @param {String} navSelector Selector that contains carousel slickjs nav
     *
     */
    var loadCarouselViewers = function(imgData, slidesSelector, navSelector) {
        var $slides = $(slidesSelector);
        var $nav = $(navSelector);
        var $videoSlide = settings.videoSlide;
        var videoID = imgData['video'].data;

        var scrollOnDesktop = true; // Placeholder for MHW / SOR functionality
        var player; // iframe containing video player

        /* TODO: Figure out where to store default N/A image */
        //var imgNA = "/on/demandware.static/Sites-Columbia_US-Site/-/default/dw3ad2cfbf/images/noimagelarge.png";

        // Requires slick.js to be loaded
        $slides.slick({
            mobileFirst: true,
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: false,
            fade: true,
            swipe: true,
            asNavFor: navSelector,
        });
        $nav.slick({
            mobileFirst: true,
            slidesToShow: 6,
            focusOnSelect: true,
            swipe: true,
            vertical: false,
            verticalSwiping: false,
            asNavFor: slidesSelector,
            infinite: false,

            responsive: [
                {
                    breakpoint: 767,
                    settings: {
                        centerMode: false,
                        focusOnSelect: true,
                        vertical: true,
                        verticalSwiping: true,
                    }
                }
            ]
        });

        // Setup carousel slides
        for (var i in imgData['images']) {
            $slides.slick('slickAdd','<div class="loupe__slide"><figure class="loupe" data-lgimg="' + imgData.images[i] + dimParamHQ + '"><div id="loupe__lens"><img src="' + imgData.images[i] + dimParamDefault + '" class="loupe__img"></div></figure></div>');
            $nav.slick('slickAdd','<div class="loupe-nav__item"><img src="'+ imgData.images[i] + dimParamDefault + '" class="loupe-nav__img" /></div>');
        }
        // Append video slide to main carousel and nav carousel,
        if (videoID != '') {
            if (imgData['video'].host == 'youtube') {
                $slides.slick('slickAdd','<div class="loupe__slide loupe__slide--video"><img src="https://img.youtube.com/vi/'+ videoID +'/hqdefault.jpg" /></div>');
                $nav.slick("slickAdd",'<div class="loupe-nav__item loupe-nav__item--video"><img src="https://img.youtube.com/vi/'+ videoID +'/hqdefault.jpg" class="loupe-nav__img" /></div>');

                // Init YouTube viewer
                $('.loupe-nav__item--video').on('click.togglePlayback', function() {
                    // If video is already loaded, just play video
                    if ($videoSlide.find('#loupe-video').length < 1) {
                        loadYouTubeVideo(videoID);
                    }
                });
            } else if (imgData['video'].host == 'vimeo') {
                // If video is hosted by Vimeo, get thumbnail URL, which is different than the videoID and requires an API call
                $.getJSON('https://www.vimeo.com/api/v2/video/' + videoID + '.json?callback=?', {format: "json"}, function(data) {
                    $slides.slick('slickAdd','<div class="loupe__slide loupe__slide--video"><img src="https://i.vimeocdn.com/video/'+ data[0].thumbnail_large +'" /></div>');
                    $nav.slick('slickAdd','<div class="loupe-nav__item loupe-nav__item--video"><img src="https://i.vimeocdn.com/video/'+ data[0].thumbnail_large +'" class="loupe-nav__img" /></div>');

                    // Init Vimeo viewer
                    $('.loupe-nav__item--video').on('click.togglePlayback', function() {
                        // If video is already loaded, just play video
                        if ($videoSlide.find('#loupe-video').length < 1) {
                            loadVimeoVideo(videoID);
                        }
                    });
                });
            } else if (imgData['video'].host == 'scene7') {
                $slides.slick('slickAdd','<div class="loupe__slide loupe__slide--video"><img src="https://s7d2.scene7.com/is/image/ColumbiaSportswear2/'+ videoID +'?wid=675" /></div>');
                $nav.slick('slickAdd','<div class="loupe-nav__item loupe-nav__item--video"><img src="https://s7d2.scene7.com/is/image/ColumbiaSportswear2/'+ videoID +'?wid=675" class="loupe-nav__img" /></div>');

                // Init Scene7 video viewer
                $('.loupe-nav__item--video').on('click.togglePlayback', function() {
                    if($videoSlide.find('#loupe-video').length < 1) {
                        loadS7Video(videoID);
                    }
                });
            }
        }
    };

    /**
     * Load YouTube video
     * @param {String} videoID YouTube Video ID
     * @param {Object} target Target DOM element
     * @return void
     */
    var loadYouTubeVideo = function(videoID) {
        var scriptURL = 'https://www.youtube.com/iframe_api';
        var width = 1024;
        var height = 576;
        var siteURL = 'columbia.com';
        var videoHTML = '<iframe id="loupe-video" type="text/html" ' +
                            'width="'+ width +'" height="'+ height +'" ' +
                            'src="http://www.youtube.com/embed/'+ videoID +
                            '?color=white&rel=0&showinfo=0&enablejsapi=1" ' +
                            'frameborder="0">' +
                        '</iframe>';
        var $target = $('.loupe__slide--video');

        // Load video into slide
        $target.html(videoHTML);

        // Use API with existing YouTube player
        // Only load YouTube script if it is not found (YTPlayer defined)
        // Loads the YouTube IFrame Player API code asynchronously.
        if (typeof YTPlayer == 'undefined') {
            var tag = document.createElement('script');
            var firstScriptTag = document.getElementsByTagName('script')[0];
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        return false;
    }

    /**
     * Load Vimeo video
     * @param {String} videoID Vimeo Video ID
     */
    var loadVimeoVideo = function(videoID) {
        var scriptURL = 'https://player.vimeo.com/api/player.js';
        var width = 1024;
        var height = 576;
        var $target = $('.loupe__slide--video');
        var videoOptions = {
            id: videoID,
            width: width,
            loop: false
        };

        // Use API with existing YouTube player
        // Only load YouTube script if it is not found (YTPlayer defined)
        if (typeof vimeoPlayer == 'undefined') {
            var tag = document.createElement('script');
            var firstScriptTag = document.getElementsByTagName('script')[0];

            // Wait for remote script to load before assigning event listeners
            tag.onload = function() {
                // Clear placeholder image before loading video
                $target.html('');

                // Create vimeo player
                var vimeoPlayer = new Vimeo.Player($target, videoOptions);

                $('.loupe-nav__item').not('.loupe-nav__item--video')
                .on('click', function(){
                    vimeoPlayer.pause();
                });

                $('.loupe-nav__item--video')
                    .off('click.togglePlayback')
                    .on('click', function() {
                        vimeoPlayer.play();
                });
            };
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

    }

    /**
     * Load Scene7 video
     */
    var loadS7Video = function(videoID) {
        var s7ServerURL = "http://s7d2.scene7.com/is/image/";
        var s7VideoServerURL = "http://s7d2.scene7.com/is/content/";
        var s7basePath = "ColumbiaSportswear2/";
        var s7contentURL = "http://s7d2.scene7.com/skins/";
        var s7emailURL = "http://s7d2.scene7.com/s7/emailFriend";
        var s7ConfigPath = "Scene7SharedAssets/Universal_HTML5_Video";
        var scriptURL = "https://s7d2.scene7.com/s7viewers/html5/js/VideoViewer.js";
        var duplicateFound = false;
        // Only load Scene7 script if it is not found
        // Loads the Scene7 IFrame Player API code asynchronously.

        console.log("loadS7Video ("+videoID+")...");
        if (typeof s7_videoview == 'undefined') {
            console.log("s7VideoViewer not found...");
            var tag = document.createElement('script');
            var firstScriptTag = document.getElementsByTagName('script')[0];

            // Append div with id='loupe-viewer' as container for s7 video
            $('.loupe__slide--video').html('<div id="loupe-viewer"></div>');

            // Initiate viewer once script is loaded
            tag.onload = function() {
                console.log("Init new s7VideoViewer...");
                var s7_videoview = new s7viewers.VideoViewer({
                    "containerId" : "loupe-viewer",
                    "params" : {
                        "serverurl" : s7ServerURL,
                        "asset" : s7basePath + videoID,
                        "contenturl": s7contentURL,
                        "config": s7ConfigPath,
                        "autoplay": "1",
                        "loop": "1",
                        "emailurl": s7emailURL,
                        "videoserverurl": s7VideoServerURL
                    }
                }).init();

                // Simulate click on s7playPause button
                // Click on video nav item to play
                $('.loupe-nav__item').not('.loupe-nav__item--video')
                    .on('click', function(){
                        $('#loupe-viewer_playPauseButton[selected="false"]').click();
                });
                // Click on non-video nav item to pause
                $('.loupe-nav__item--video')
                    .off('click.togglePlayback')
                    .on('click', function() {
                        $('#loupe-viewer_playPauseButton[selected="true"]').click();
                });
        
            };
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }

    return {
        magnify: magnify,
        loadCarouselViewers: loadCarouselViewers,
    };

})();

/* ########## YouTube API ########### */
/* TODO: Moving out of Loupe due to scope issues */
// Use API with existing YouTube player
var YTPlayer;
var onYouTubeIframeAPIReady = function() {
    YTPlayer = new YT.Player('loupe-video', {
        events: {
            'onReady': onPlayerReady,
        }
    });
}

// The API will call this function when the video player is ready.
var onPlayerReady = function(event) {
    // Setup click event that can pause videos when the iframe loses "focus"
    $('.loupe-nav__item').not('.loupe-nav__item--video')
        .on('click', function(){
            YTPlayer.pauseVideo();
    });

    $('.loupe-nav__item--video')
        .off('click.togglePlayback')
        .on('click', function() {
            YTPlayer.playVideo();
    });
}

/* ########## INITIALIZATION ########## */
$(function() {
    /* Placeholder for JSON data that should come from PDP variant
        TODO: Change reference to json object
        * N/A image URL?
        * alt text?
        * type, eg. _f, _b, a1, a2, a3, video?
    */
    var imgData = {
        "images": [
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_f",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_b",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a1",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2",
        ],
        "video": {
          "data": "tu2-xbn2Zjc",
          "host": "youtube"
        }
    };
    var imgData_vimeo = {
        "images": [
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_f",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_b",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a1",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2",
        ],
        "video": {
          "data": "61227076",
          "host": "vimeo"
        }
    };
    var imgData_s7 = {
        "images": [
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_f",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_b",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a1",
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2",
        ],
        "video": {
          "data": "sor16-web",
          "host": "scene7"
        }
    };

    // Load images for selected product variant
    Loupe.loadCarouselViewers( imgData_s7, '.loupe-main', '.loupe-nav');
    // Initiate loupe mode on image
    Loupe.magnify( '.loupe' );
});