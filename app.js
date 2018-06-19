// Simulate globals from appresources.isml
var app = {
  constants: {
    TABLET_MAX_WIDTH: 1023
  }
};

/**
 * Loupe viewer, designed for viewing and magnifying a set of product images
 * Requires JQuery, SlickJS
 *
 */
var Loupe = (function () {
    var _ = this;

    init = function (settings, imgJson) {
        // Load images for selected product variant
        if (imgJson !== null) {
            // Module defaults
            _.defaults = {
                maxTabletWidth: app.constants.TABLET_MAX_WIDTH,
                defaultWidth: 767,
                defaultHeight: 767,
                hqWidth: 1280,
                hqHeight: 1280,
                loupeSelector: ".loupe",
                navContainer: ".loupe-nav",
                slideContainer: ".loupe-main",
                videoSelector: ".loupe__slide--video",
                navItemSelector: ".loupe-nav__item, .slick-dots button",
                navVideoSelector: ".loupe-nav__item--video, .slick-is-video",
                scrollOnDesktop: false, // Placeholder for MHW/SOR functionality
                showThumbnails: true, // Toggle thumbnails, eg. Quick View
                viewerCarouselOptions: {
                    accessibility: false,
                    mobileFirst: true,
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    arrows: false,
                    dots: true,
                    fade: true,
                    swipe: true,
                    asNavFor: ".loupe-nav" // TODO: Make this configurable
                },
                navCarouselOptions: {
                    accessibility: false,
                    mobileFirst: true,
                    slidesToShow: 6,
                    focusOnSelect: true,
                    swipe: true,
                    vertical: false,
                    verticalSwiping: false,
                    asNavFor: ".loupe-main", // TODO: Make this configurable
                    infinite: false,

                    responsive: [{
                        breakpoint: app.constants.TABLET_MAX_WIDTH,
                        settings: {
                            centerMode: true,
                            centerPadding: '0px',
                            focusOnSelect: true,
                            slidesToShow: 6,
                            vertical: true,
                            verticalSwiping: true
                        }
                    }]
                }
            };

            // Setup configuration, accounting for any override settings
            _.config = $.extend(_, _.defaults, settings);

            // Setup default S7 image parameters
            _.dimParamDefault = "?wid=" + config.defaultWidth + "&hei=" + config.defaultHeight;
            _.dimParamHQ = "?wid=" + config.hqWidth + "&hei=" + config.hqHeight;

            // Add json data to Loupe
            _.imgData = imgJson;

            // Load images for selected product variant
            loadCarouselViewers(imgJson);

            // Initiate loupe mode on image
            magnify(config.loupeSelector);

            // Timeout for optimized performance on resize events
            _.resizeTimout;
            // Setup resize listener
            $(window).on('resize', function () {
                clearTimeout(_.resizeTimout);
                _.resizeTimout = setTimeout(_toggleCompactMode, 250);
            });

            _toggleCompactMode();

        } else {
            throw "Loupe.init: No image data found."
        }
    };

    //-------------------- HELPER FUNCTIONS --------------------//
    /**
     * Triggered by window.resize(), initiate compact mode (no thumbnails)
     * and the default desktop view for QuickView and mobile/tablet devices
     */
    var _toggleCompactMode = function () {
        // If thumbnails are turned off, do not render the nav slick component
        // Also, use single slick component with dots for mobile and tablet
        if (!config.showThumbnails || window.innerWidth <= maxTabletWidth) {
            // TODO: Update function to omit unneeded component; for now, we're just hiding it
            _setCompactMode();
        } else {
            _unsetCompactMode();
        }
    };

    /**
     * Removes all slides from an existing Slick JS carousel
     * @param {String} slidesObj Target slide container
     */
    var _deleteAllSlides = function (slidesObj) {
        // We only need to remove slides if carousel is initialized
        if (slidesObj.is(".slick-initialized")) {
            slidesObj.slick("slickRemove", null, null, true);
        }
    }
    /**
     * Apply custom style to slide navigation for video slides
     * Pre-req: .slide-dot li has to exist
     */
    var _styleVideoDot = function() {
        // Keep checking until slick has completed adding dot navigation
        var dotsExist = setInterval(function() {
            if ($('.loupe-main .slick-dots').length) {
                var vidSlideDot = $(".loupe-main .slick-dots li").get(-1);
                $(vidSlideDot).addClass("slick-is-video");
                clearInterval(dotsExist);
            }
        }, 100);
    }

    /**
     * Append slides to the Slick JS carousel
     * @param {Object} slidesObj Target container for all the slides
     * @param {String} slideHTML HTML for the slide
     * @param {function} callback Optional call back function
     */
    var _addSlide = function (slidesObj, slideHTML, callback) {
        slidesObj.slick('slickAdd', slideHTML);
        if (callback != null) {
            callback();
        }
    }

    /**
     * Append video slide to main carousel and nav carousel
     * @param {*} imgData 
     */
    var _appendVideoSlides = function (imgData, videoID) {
        console.log('_appendVideoSlides imgData = ' + JSON.stringify(imgData));
        var $slides = $(config.slideContainer);
        var $nav = $(config.navContainer);
        var videoID = (imgData["video"] != null) ? imgData["video"].data : null;

        // TODO: Optimize this block to be more DRY
        if (videoID && videoID !== null) {
            var vidSlideHTML = '<div class="loupe__slide loupe__slide--video"><div class="embed-responsive--16-9"></div></div>';

            if (imgData["video"].host == "youtube") {
                var vidNavSlide = '<div class="loupe-nav__item loupe-nav__item--video">' +
                    '<img src="https://img.youtube.com/vi/' + videoID + '/hqdefault.jpg" class="loupe-nav__img" ' +
                    'alt="Video thumbnail: ' + imgData.colorValue + ' ' + imgData.alt + '" />' +
                    '</div>';

                // Add video slick slide with video placeholder, add navigation slide
                _addSlide($slides, vidSlideHTML);
                _addSlide($nav, vidNavSlide, _styleVideoDot);

                // Add ability to custom style to video slick dot
                // _styleVideoDot();

                // Init YouTube viewer from thumbnail and dot
                $(config.navVideoSelector).on("click.togglePlayback", function () {
                    // If video is already loaded, just play video
                    if ($(videoSelector).find("#loupe-video").length < 1) {
                        loadYouTubeVideo(videoID);
                    }
                });
            } else if (imgData["video"].host == "vimeo") {
                // If video is hosted by Vimeo, get thumbnail URL, which is different than the videoID and requires an API call
                $.getJSON(
                    'https://www.vimeo.com/api/v2/video/' + videoID + '.json?callback=?', {
                        format: 'json'
                    },
                    function (data) {
                        var vidNavSlide = '<div class="loupe-nav__item loupe-nav__item--video">' +
                            '<img src="https://i.vimeocdn.com/video/' + data[0].thumbnail_large + '" ' +
                            'class="loupe-nav__img" ' +
                            'alt="Video thumbnail: ' + imgData.colorValue + ' ' + imgData.alt + '" />' +
                            '</div>';

                        // Add video slick slide with video placeholder, add navigation slide
                        _addSlide($slides, vidSlideHTML);
                        _addSlide($nav, vidNavSlide, _styleVideoDot);

                        // Add ability to custom style to video slick dot
                        // _styleVideoDot();

                        // Init Vimeo viewer from thumbnail and dot
                        $(config.navVideoSelector).on("click.togglePlayback", function () {
                            // If video is already loaded, just play video
                            if ($(".loupe__item--video").find("#loupe-video").length < 1) {
                                loadVimeoVideo(videoID);
                            }
                        });
                    }
                );
            } else if (imgData["video"].host == "scene7") {
                console.log('appendVideoSlides()... scene7 video');
                var vidNavSlide = '<div class="loupe-nav__item loupe-nav__item--video">' +
                    '<img src="https://s7d2.scene7.com/is/image/ColumbiaSportswear2/' + videoID + '?wid=' + config.defaultWidth + '" class="loupe-nav__img" ' +
                    'alt="Video thumbnail: ' + imgData.colorValue + ' ' + imgData.alt + '" />' +
                    '</div>';

                // Add video slick slide with video placeholder, add navigation slide
                _addSlide($slides, vidSlideHTML);
                _addSlide($nav, vidNavSlide, _styleVideoDot);

                // Init Scene7 video viewer from thumbnail and dot
                $(config.navVideoSelector).on("click.togglePlayback", function () {
                    if ($(".loupe__item--video").find("#loupe-video").length < 1) {
                        loadS7Video(videoID);
                    }
                });
            }
        }
    }
    /**
     * When the actual number of slides is less than the max number of
     * Navigation dots
     * @param {Object} navObj Target container for navigation slides
     * @param {Integer} numSlides Number of slides in the nav
     * @param {Integer} maxSlides Maximum slides to show in mobile navigation
     */
    var _recenterNav = function (navObj, numSlides, maxSlides) {
        if (numSlides > maxSlides) {
            navObj.slick('setOption', 'slidesToShow', maxSlides, true);
        } else {
            navObj.slick('setOption', 'slidesToShow', numSlides, true);
        }
    }

    /**
     * 
     */
    var _setCompactMode = function () {
        // TODO: Update function to omit unneeded component; for now, we're just hiding it
        $(config.navContainer).hide();
        $(config.slideContainer).slick(
            "setOption", {
                dots: true
            },
            true
        );
    }

    /**
     * 
     */
    var _unsetCompactMode = function () {
        $(config.navContainer).show();
        $(config.navContainer).slick('reinit');
        $(config.slideContainer).slick('setOption', 'dots', false, true);
    }

    //-------------------- MAIN FUNCTIONS --------------------//
    /**
     * Activate 'magnifying glass' effect.
     * Pre-requisite: HTML must follow a template
     * @access public
     * @param {String} selector DOM selector containing loupe images
     */
    var magnify = function (selector) {
        // TODO: Investigate why event listeners were not getting assigned/reassigned to .loupe in original implementation
        $(config.slideContainer).off(); // Reset listeners
        $(config.slideContainer).on({
            click: function () {
                var imgURI = $(this).data("lgimg");
                $(this).css("background-image", "url(" + imgURI + ")");
                $(this).toggleClass("is-active");
            },
            mousemove: function (e) {
                if ($(this).hasClass("is-active")) {
                    var magnified = e.currentTarget;
                    e.offsetX ? (offsetX = e.offsetX) : (offsetX = e.touches[0].pageX);
                    e.offsetY ? (offsetY = e.offsetY) : (offsetX = e.touches[0].pageX);
                    x = offsetX / magnified.offsetWidth * 100;
                    y = offsetY / magnified.offsetHeight * 100;
                    magnified.style.backgroundPosition = x + "% " + y + "%";
                }
            },
            mouseleave: function () {
                $(this).removeClass("is-active");
            }
        }, selector);
    };

    /**
     * Load carousel with image viewers; Sets up two carousels: 1) Main images 2) Navigation for images
     * @access public
     * @param {String} imgData JSON data containing image URLs
     */
    var loadCarouselViewers = function (imgData) {

        // Maximum slides to show in mobile navigation
        var maxSlides = 7;

        // Define nav and viewer selectors from config
        var $slides = $(config.slideContainer);
        var $nav = $(config.navContainer);
        var $navItemVid = $(config.navVideoSelector);
        var $videoSlide = $(config.videoSelector);

        // numSlides: Hardcoding 1 for video until support is added for multiple videos
        var numSlides = Object.keys(imgData.images).length + 1;

        // Load slick sliders only if slick hasn't already been initialized
        $slides.not(".slick-initialized").slick(config.viewerCarouselOptions);
        $nav.not(".slick-initialized").slick(config.navCarouselOptions);

        // Remove all slides from any existing slides
        _deleteAllSlides($slides);
        _deleteAllSlides($nav);

        // Re-center navigation based on how many slides should show
        _recenterNav($nav, numSlides, maxSlides);

        // Setup carousel slides
        for (var i in imgData["images"]) {
            var mainSlideHTML = '<div class="loupe__slide"><figure class="loupe" data-lgimg="' + imgData.images[i] + dimParamHQ + '">' +
                '<div id="loupe__lens"><img src="' + imgData.images[i] + dimParamDefault + '" alt="' + imgData.colorValue + ' ' + imgData.alt + ', View ' + i + '" class="loupe__img d-block">' +
                '</div>' +
                '</figure></div>';
            var navSlideHTML = '<div class="loupe-nav__item"><img src="' + imgData.images[i] + dimParamDefault + '" alt="' + imgData.colorValue + ' ' + imgData.alt + ', View ' + i + '" class="loupe-nav__img" /></div>';

            _addSlide($slides, mainSlideHTML);
            _addSlide($nav, navSlideHTML);
        }

        // Add video slide
        _appendVideoSlides(imgData);

        // Exception: do not initialize slides if scrolling
        if (config.scrollOnDesktop) {
            $slides.slick('setOption', 'fade', false, true);
            $slides.slick('unslick');
            $slides.find('.loupe__slide').attr('style',''); // Temporary fix for Slick JS 1.6.0 bug

            // Make nav links slide to loupe-main slide
            $nav.on('click', '.loupe-nav__item', function() {
                var idx = $(this).index();
                console.log('Click event detected on nav item...' + $(this).attr('class') + ' (index: ' + $(this).index() + ')');
                $slides.animate({
                    scrollTop: $('.loupe__slide').get(idx).offset().top
                }, 500);
            })

            // Make non loupe-main columns 'sticky' using sticky kit
        }
    };

    /**
     * Load YouTube video
     * @param {String} videoID YouTube Video ID
     * @param {Object} target Target DOM element
     * @return void
     */
    var loadYouTubeVideo = function (videoID) {
        var scriptURL = "https://www.youtube.com/iframe_api";
        var $target = $(".embed-responsive--16-9");
        var width = config.defaultWidth;
        var height = config.defaultHeight;
        var videoHTML =
            '<iframe id="loupe-video" type="text/html" width="' + width + '" height="' + height + '" ' +
            'src="https://www.youtube.com/embed/' + videoID + '?color=white&rel=0&showinfo=0&enablejsapi=1" frameborder="0" allowFullScreen="allowFullScreen">' +
            "</iframe>";

        // Load video into slide
        $target.html(videoHTML);

        // Use API with existing YouTube player
        // Only load YouTube script if it is not found (YTPlayer defined)
        // Loads the YouTube IFrame Player API code asynchronously.
        if (typeof YTPlayer == "undefined") {
            var tag = document.createElement("script");
            var firstScriptTag = document.getElementsByTagName("script")[0];
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        // Use API with existing YouTube player
        window.onYouTubeIframeAPIReady = function () {
            window.YTPlayer = new YT.Player("loupe-video", {
                events: {
                    onReady: onPlayerReady
                }
            });
        };

        // The API will call this function when the video player is ready.
        window.onPlayerReady = function (event) {
            // Setup click event that can pause videos when the iframe loses "focus"
            $(config.navItemSelector)
                .not(config.navVideoSelector)
                .on("click", function () {
                    YTPlayer.pauseVideo();
                });

            $(config.navVideoSelector)
                .off("click.togglePlayback")
                .on("click", function () {
                    YTPlayer.playVideo();
                });
        };

        return false;
    };

    /**
     * Load Vimeo video
     * @param {String} videoID Vimeo Video ID
     */
    var loadVimeoVideo = function (videoID) {
        var scriptURL = "https://player.vimeo.com/api/player.js";
        var $target = $(".embed-responsive--16-9");
        var width = config.defaultWidth;
        var $navItem = $(config.navItemSelector);
        var $navItemVideo = $(config.navVideoSelector);
        var videoOptions = {
            id: videoID,
            width: width,
            loop: false
        };

        // Use API with existing YouTube player
        // Only load YouTube script if it is not found (YTPlayer defined)
        if (typeof vimeoPlayer == "undefined") {
            var tag = document.createElement("script");
            var firstScriptTag = document.getElementsByTagName("script")[0];

            // Wait for remote script to load before assigning event listeners
            tag.onload = function () {
                // Clear placeholder image before loading video
                $target.html("");

                // Create vimeo player
                var vimeoPlayer = new Vimeo.Player($target, videoOptions);

                // Click on non-video nav item to pause
                $(config.navItemSelector)
                    .not(config.navVideoSelector)
                    .on("click", function () {
                        vimeoPlayer.pause();
                    });

                // Click on video nav item to play]
                $(config.navVideoSelector)
                    .off("click.togglePlayback")
                    .on("click", function () {
                        vimeoPlayer.play();
                    });
            };
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    };

    /**
     * Load Scene7 video
     */
    var loadS7Video = function (videoID) {
        var scriptURL = "https://s7d2.scene7.com/s7viewers/html5/js/VideoViewer.js";
        var $target = $(".embed-responsive--16-9");
        var s7ServerURL = "https://s7d2.scene7.com/is/image/";
        var s7VideoServerURL = "https://s7d2.scene7.com/is/content/";
        var s7basePath = "ColumbiaSportswear2/";
        var s7contentURL = "https://s7d2.scene7.com/skins/";
        var s7emailURL = "https://s7d2.scene7.com/s7/emailFriend";
        var s7ConfigPath = "Scene7SharedAssets/Universal_HTML5_Video";

        // Only load Scene7 script if it is not found
        // Loads the Scene7 IFrame Player API code asynchronously.
        if (typeof s7_videoview == "undefined") {
            var tag = document.createElement("script");
            var firstScriptTag = document.getElementsByTagName("script")[0];

            // Append div with id='loupe-viewer' as container for s7 video
            $target.attr("id", "loupe-viewer");

            // Clear placeholder image before loading video
            $target.html("");

            // Initiate viewer once script is loaded
            tag.onload = function () {
                var s7_videoview = new s7viewers.VideoViewer({
                    containerId: "loupe-viewer",
                    params: {
                        serverurl: s7ServerURL,
                        asset: s7basePath + videoID,
                        contenturl: s7contentURL,
                        config: s7ConfigPath,
                        autoplay: "1",
                        loop: "1",
                        emailurl: s7emailURL,
                        videoserverurl: s7VideoServerURL
                    }
                }).init();

                // Simulate click on s7playPause button
                // Click on non-video nav item to pause
                $(config.navItemSelector)
                    .not(config.navVideoSelector)
                    .on("click", function () {
                        // Class generated by S7, selected="false" equivalent to pauseBtn
                        $('#loupe-viewer_playPauseButton[selected="false"]').click();
                    });

                // Click on video nav item to play
                $(config.navVideoSelector)
                    .off("click.togglePlayback")
                    .on("click", function () {
                        // Class generated by S7, selected="true" equivalent to playBtn
                        $('#loupe-viewer_playPauseButton[selected="true"]').click();
                    });
            };
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    };

    return {
        init: init,
        _styleVideoDot: _styleVideoDot
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
    images: [
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_b",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a1",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2"
    ],
    video: {
      data: "tu2-xbn2Zjc",
      host: "youtube"
    }
  };
  var imgData_yt2 = {
    images: [
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_691_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_691_b",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_691_a1",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_691_a2"
    ],
    video: {
      data: "tu2-xbn2Zjc",
      host: "youtube"
    }
  };
  var imgData_vimeo = {
    images: [
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_691_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_691_b",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_691_a1"
    ],
    video: {
      data: "61227076",
      host: "vimeo"
    }
  };
  var imgData_s7 = {
    images: [
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_b",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_a1",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_a1",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2"
    ],
    video: {
      data: "sor16-web",
      host: "scene7"
    }
  };

  $(".swatch1").on("click", function() {
    Loupe.init(
      {
        showThumbnails: false,
        // scrollOnDesktop: true
      },
      imgData
    );
  });
  $(".swatch2").on("click", function() {
    Loupe.init(
      {
        showThumbnails: false
      },
      imgData_vimeo
    );
  });
  $(".swatch3").on("click", function() {
    Loupe.init(
      {
        showThumbnails: false
      },
      imgData_s7
    );
  });
  $(".swatch4").on("click", function() {
    Loupe.init({}, imgData);
  });
});
