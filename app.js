/**
 * Loupe viewer, designed for viewing and magnifying a set of product images
 * Require JQuery, SlickJS
 */
var Loupe = (function() {
    /* TODO figure out how to store Scene7 parameters */
    // var dimParamThumbs = '?wid=80&hei=80';   // Try reusing default for thumbs, too
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
     * 
     */
    var scriptLoaded = function(src) {
        var duplicateFound = false;
        // Only load script if it is not already loaded
        
        var loadedScripts = document.getElementsByTagName("script");
        for (var i = 0; i < loadedScripts.length; i++){
            if (loadedScripts[i].src == src) { // Make sure script isn't already loaded
                duplicateFound = true;
                break;
            }     
        }

        return duplicateFound;
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

        /* TODO: Figure out where to store default N/A image */
        var imgNA = "/on/demandware.static/Sites-Columbia_US-Site/-/default/dw3ad2cfbf/images/noimagelarge.png";

        // Setup carousel slides
        for (var i in imgData["images"]) {
            var slide = "<div class='loupe__slide'><figure class='loupe' data-lgimg='"+imgData.images[i]+dimParamHQ+"'><div id='loupe__lens'><img src='"+imgData.images[i]+dimParamDefault+"' class='loupe__img'></div></figure></div>";
            var navSlide = "<div class='loupe-nav__item'><img src='"+imgData.images[i]+dimParamDefault+"' class='loupe-nav__img' /></div>";
            $slides.append(slide);
            $nav.append(navSlide);
        }
        for (var j in imgData["videos"]) {
            /* TODO: Where should I get the video thumbnail? */
            // Append video slide to main carousel and nav carousel
            $slides.append("<div class='loupe__slide loupe__slide--video'><img src='https://img.youtube.com/vi/"+ imgData["videos"][j] +"/hqdefault.jpg' /></div>");
            $nav.append("<div class='loupe-nav__item loupe-nav__item--video'><img src='https://img.youtube.com/vi/"+ imgData["videos"][j] +"/hqdefault.jpg' class='loupe-nav__img' /></div>")
        }

        // Init video viewer (draft)
        $('.loupe-nav__item--video').on('click', loadYouTubeVideo);

        // Requires slick.js to be loaded
        $slides.slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: false,
            fade: true,
            swipe: true,
            asNavFor: navSelector
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
    };   

    /**
     * Load YouTube video
     */
    var loadYouTubeVideo = function() {
        var scriptURL = "https://www.youtube.com/iframe_api";
        var width = 1024;
        var height = 576;
        var siteURL = 'columbia.com';
        var videoID = 's6Ine_o2lLM';
        var videoHTML = '<iframe id="player" type="text/html" ' +
                            'width="'+ width +'" height="'+ height +'" ' +
                            'src="http://www.youtube.com/embed/'+ videoID +
                            '?color=white &rel=0&showinfo=0&origin='+ siteURL +'&enablejsapi=1" ' +
                            'frameborder="0">' + 
                        '</iframe>';
        var $target = $('.loupe__slide--video');
        
        // Use API with existing YouTube player
        // Only load YouTube script if it is not found
        // Loads the YouTube IFrame Player API code asynchronously.
        if (!scriptLoaded(scriptURL)) {// Add check for existing YT script
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        // Use API with existing YouTube player
        var player;
        function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                events: {
                    'onError': onError,
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }

        // The API will call this function when the video player is ready.
        function onPlayerReady(event) {
            event.target.playVideo();
        }

        function onPlayerStateChange(event) {
            // Define behavior for when 
        }

        function onError(event) {
            // Define error bevavior
        }

        // Load the IFrame Player API code asynchronously.
        console.log ('loading YouTube video...');
        // Hide img currently in focus
        $('.loupe__slide--video.loupe__img').hide();
        $target.html(videoHTML);
        
        // Pause videos when they lose focus
        $target.on('blur', function(){
            $(this).pauseVideo();
        });
        
        return false;
    }

    /**
     * Load Scene7 video
     */
    var loadS7Video = function() {
        var scriptURL = "https://s7d2.scene7.com/s7viewers/html5/js/VideoViewer.js";
        var duplicateFound = false;
        // Only load Scene7 script if it is not found
        // Loads the Scene7 IFrame Player API code asynchronously.
        
        var loadedScripts = document.getElementsByTagName("script");
        for (var i = 0; i < loadedScripts.length; i++){
            if (loadedScripts[i].src == scriptURL) { // Make sure script isn't already loaded
                duplicateFound = true;
                break;
            }     
        }

        if (!scriptLoaded(scriptURL)) {
            var tag = document.createElement('script');
            tag.src = scriptURL;
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        
        if (typeof s7viewers.VideoViewer != 'function') {
            var s7_videoview = new s7viewers.VideoViewer({
                "containerId" : "s7_videoview",
                "params" : {
                    "serverurl" : "http://s7d2.scene7.com/is/image/",
                    "asset" : "ColumbiaSportswear2/sor16-web",
                    "contenturl": "http://s7d2.scene7.com/skins/",
                    "config": "Scene7SharedAssets/Universal_HTML5_Video", 
                    "emailurl": "http://s7d2.scene7.com/s7/emailFriend", 
                    "videoserverurl": "http://s7d2.scene7.com/is/content/"
                }	
            }).init();
        }
    }
    
    return {
        magnify: magnify,
        loadCarouselViewers: loadCarouselViewers,
        loadS7Video: loadS7Video
    };

})();

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
        "videos": [
            "s6Ine_o2lLM"
        ],
        "videoHost": "youtube"
    };

    // Load images for selected product variant
    Loupe.loadCarouselViewers( imgData, '.loupe-main', '.loupe-nav');
    // Initiate loupe mode on image
    Loupe.magnify( '.loupe' );

    // Test Scene7Viewer
    Loupe.loadS7Video();

});