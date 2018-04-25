/**
 * Require JQuery, sticky-kit
 */
$(function() {
    var loadImages, toggleZoom;
    /* TODO figure out how to store Scene7 parameters */
    var widthParamThumb = '?wid=50&hei=50';
    var widthParamDefault = '?wid=768&hei=768';
    var widthParamloupe = '?wid=1024&hei=1024';

    toggleZoom = function(selector) {
      $(selector).on({
        click: function() {
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
     * Load images from data object to the viewer
     * @param {String} imgData JSON data containing image URLs
     * @param {String} target Selector that displays selected image
     * @param {String} thumbNails Selector that contains thumbnail navigation
     * 
     */
    loadImages = function(imgData, target, thumbNails) {
        var viewer = $(target);
        var thumbsNav = $(thumbNails);
        /* TODO: Figure out where to store default N/A image */
        var imgNA = "/on/demandware.static/Sites-Columbia_US-Site/-/default/dw3ad2cfbf/images/noimagelarge.png";
        var loupe = $('.loupe');
        var loupeimg = $('.loupe__img');

        // Setup thumbnails
        for (var i in imgData["images"]) {
            var thumb = "<div class='pdp-thumb'><img src='"+ imgData.images[i]+widthParamThumb+"' data-zoomout='"+imgData.images[i]+"' /></div>";
            thumbsNav.append(thumb);
        }
        for (var j in imgData["videos"]) {
            /* TODO: Where should I get the video thumbnail? */
            thumbsNav.append("<div class='pdp-thumb pdp-thumb--video'><img src='http://via.placeholder.com/50x50' /></div>");
        }

        // Setup onclick behavior for thumbnails
        $('.pdp-thumb')
            .on('click', function() {
                var imgURL = $(this).find('img').data('zoomout');
                // Update 'selected state'
                $('.pdp-thumb--selected').toggleClass('pdp-thumb--selected');
                $(this).toggleClass('pdp-thumb--selected');

                // Check for video
                if ( $(this).hasClass('pdp-thumb--video') ) {
                    loadYouTubeVideo();
                }
                else {
                    // Load normal size image into viewer
                    loupeimg.attr('src', imgURL+widthParamDefault);
                    // Load magnified image into viewer
                    loupe.css('background-image','url('+imgURL+widthParamloupe+')');
                }
            }
        );

        // Init first thumbnail
        $('.pdp-thumb:first').click();

    }

   /**
     * Load carousel with image viewers; Sets up two carousels: 1) Main images 2) Navigation for images
     * @param {String} imgData JSON data containing image URLs
     * @param {String} slidesSelector Selector that contains carousel slickjs slides
     * @param {String} navSelector Selector that contains carousel slickjs nav
     * 
     */
    loadCarouselViewers = function(imgData, slidesSelector, navSelector) {
        var slides = $(slidesSelector);
        var nav = $(navSelector);

        /* TODO: Figure out where to store default N/A image */
        var imgNA = "/on/demandware.static/Sites-Columbia_US-Site/-/default/dw3ad2cfbf/images/noimagelarge.png";
        var loupe = $('.loupe');
        var loupeimg = $('.loupe__img');

        // Setup carousel slides
        for (var i in imgData["images"]) {
            var slide = "<div class='loupe__slide'><figure class='loupe' style='background-image:url("+imgData.images[i]+widthParamloupe+")'><div id='loupe__lens'><img class='loupe__img' src='"+imgData.images[i]+widthParamDefault+"'></div></figure></div>";
            var navSlide = "<div><i class='fa fa-circle'></i></div>";
            slides.append(slide);
            nav.append(navSlide);
        }
        for (var j in imgData["videos"]) {
            /* TODO: Where should I get the video thumbnail? */
            // Append video slide to main carousel and nav carousel
            slides.append("<div class='pdp-thumb pdp-thumb--video'><img src='http://via.placeholder.com/50x50' /></div>");
            nav.append("<div><i class='fa fa-play-circle'></i></div>")
        }

        // Init carousel (test only)
        // Requires slick.js to be loaded
        $(function(){
            slides.slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                arrows: false,
                fade: true,
                asNavFor: navSelector
            });
            nav.slick({
                slidesToShow: 5,
                slidesToScroll: 1,
                asNavFor: slidesSelector,
                centerMode: true,
                focusOnSelect: true
            });
        });
    }    

    /**
     * Load YouTube video
     */
    loadYouTubeVideo = function() {
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
    // loadImages( imgData, '.loupe', '.pdp-thumbs');
    loadCarouselViewers( imgData, '.slider-product', '.slider-nav');
    // Initial carousel
    // $('.pdp-thumbs').slick();
    // Initiate loupe mode on image
    toggleZoom( '.loupe' );
  });