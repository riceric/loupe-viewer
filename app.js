/**
 * Loupe viewer, designed for viewing and magnifying a set of product images
 * Require JQuery, sticky-kit
 */
var Loupe = (function() {
    /* TODO figure out how to store Scene7 parameters */
    var dimParamThumbs = '?wid=80&hei=80';
    var dimParamDefault = '?wid=900&hei=675';
    var dimParamHQ = '?wid=1280&hei=960';

    /**
     * Activate 'magnifying glass' effect. 
     * Pre-requisite: HTML must follow a template
     * @access public
     * @param {String} selector DOM selector containing loupe images
     */
    var toggleZoom = function(selector) {
      $(selector).on({
        click: function() {
            var imgURI = $(this).data('lgimg');
            $(this).css('background-image','url('+imgURI+')');
            $(this).toggleClass('active');
        },
        mousemove: function(e) {
          if ($(this).hasClass('active')) {
            var loupeed = e.currentTarget;
            e.offsetX ? offsetX = e.offsetX : offsetX = e.touches[0].pageX;
            e.offsetY ? offsetY = e.offsetY : offsetX = e.touches[0].pageX;
            x = offsetX/loupeed.offsetWidth*100;
            y = offsetY/loupeed.offsetHeight*100;
            loupeed.style.backgroundPosition = x + '% ' + y + '%';     
          }
        },
        mouseleave: function() {
          $(this).removeClass('active');
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

        /* TODO: Figure out where to store default N/A image */
        var imgNA = "/on/demandware.static/Sites-Columbia_US-Site/-/default/dw3ad2cfbf/images/noimagelarge.png";

        // Setup carousel slides
        for (var i in imgData["images"]) {
            var slide = "<div class='loupe__slide'><figure class='loupe' data-lgimg='"+imgData.images[i]+dimParamHQ+"'><div id='loupe__lens'><img src='"+imgData.images[i]+dimParamDefault+"' class='loupe__img'></div></figure></div>";
            var navSlide = "<div class='loupe-nav__item'><img src='"+imgData.images[i]+dimParamThumbs+"' class='loupe-nav__img' /></div>";
            $slides.append(slide);
            $nav.append(navSlide);
        }
        // for (var j in imgData["videos"]) {
        //     /* TODO: Where should I get the video thumbnail? */
        //     // Append video slide to main carousel and nav carousel
        //     $slides.append("<div class='loupe__slide loupe__slide--video'><img src='https://img.youtube.com/vi/s6Ine_o2lLM/hqdefault.jpg' /></div>");
        //     $nav.append("<div class='loupe-nav__item loupe-nav__item--video'><img src='https://img.youtube.com/vi/s6Ine_o2lLM/default.jpg' class='loupe-nav__img' /></div>")
        // }

        // Init carousel (test only)
        // Requires slick.js to be loaded
        $slides.slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: false,
            fade: true,
            asNavFor: navSelector
        });
        $nav.slick({
            slidesToShow: 5,
            slidesToScroll: 1,
            asNavFor: slidesSelector,
            focusOnSelect: true,
            vertical: true,
            infinite: false,

            responsive: [
                {
                    breakpoint: 767,
                    settings: {
                        // slidesToShow: 5,
                        // slidesToScroll: 3,
                        centerMode: true,
                        focusOnSelect: true,
                        vertical: false,
                    }
                }                  
            ]               
        });
    };   

    /**
     * Load YouTube video
     */
    var loadYouTubeVideo = function() {
        // Load the IFrame Player API code asynchronously.
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/player_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        console.log ('loading YouTube video...');

        // Hide img currently in focus
        $('.loupe__img').hide();

        // Replace the 'ytplayer' element with an <iframe> and
        // YouTube player after the API code downloads.
        var player;
        function onYouTubePlayerAPIReady() {
            console.log ('onYouTubePlayerAPIReady...');
            player = new YT.Player('loupe__lens', {
                height: '360',
                width: '640',
                videoId: 's6Ine_o2lLM'
            });
        }
    }
    
    return {
        toggleZoom: toggleZoom,
        loadCarouselViewers: loadCarouselViewers
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
            "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2"
        ],
        "videos": [
            "https://www.youtube.com/embed/s6Ine_o2lLM?color=white&rel=0&showinfo=0"
        ]
    };

    // Load images for selected product variant
    Loupe.loadCarouselViewers( imgData, '.loupe-main', '.loupe-nav');
    // Initiate loupe mode on image
    Loupe.toggleZoom( '.loupe' );

});