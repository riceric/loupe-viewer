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
                loupeSelector: '.loupe',
                navContainer: '.loupe-nav',
                slideContainer: '.loupe-main',
                videoSelector: '.loupe__slide--video',
                navItemSelector: '.loupe-nav__item, .slick-dots button',
                navVideoSelector: '.loupe-nav__item--video, .slick-is-video',
                scrollOnDesktop: false,
                showThumbnails: true, // Toggle thumbnails, eg. Quick View
                viewerCarouselOptions: {
                    accessibility: false,
                    mobileFirst: true,
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    arrows: false,
                    dots: true,
                    fade: true,
                    infinite: false,
                    swipe: true,
                    asNavFor: '.loupe-nav' // TODO: Make this configurable
                },
                navCarouselOptions: {
                    accessibility: false,
                    mobileFirst: true,
                    slidesToShow: 6,
                    focusOnSelect: true,
                    infinite: false,
                    swipe: true,
                    vertical: false,
                    verticalSwiping: false,
                    asNavFor: '.loupe-main', // TODO: Make this configurable

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
            _.dimParamDefault = '?wid=' + config.defaultWidth + '&hei=' + config.defaultHeight;
            _.dimParamHQ = '?wid=' + config.hqWidth + '&hei=' + config.hqHeight;

            // Add json data to Loupe
            _.imgData = imgJson;

            // Load images for selected product variant
            _loadCarouselViewers(imgJson);

            // Initiate loupe mode on image
            _magnify(config.loupeSelector);

            // Timeout for optimized performance on resize events
            _.resizeTimout;
            // Setup resize listener
            $(window).on('resize', function () {
                clearTimeout(_.resizeTimout);
                _.resizeTimout = setTimeout(_toggleCompactMode, 250);
            });

            _toggleCompactMode();

        } else {
            throw 'Loupe.init: No image data found.'
        }
    };

    // Object to store multiple YT Players with separate API event handlers
    _.YTPlayers = {};

    //-------------------- HELPER FUNCTIONS --------------------//
    /**
     * Reinitialize slick if not already initialized
     */
    var _reinitSlick = function() {
        // Reinitialize slick on empty container... we will be loading them up again
        $(config.slideContainer).not('.slick-initialized').slick(config.viewerCarouselOptions);
        $(config.navContainer).not('.slick-initialized').slick(config.navCarouselOptions);
    }

    /**
     * Removes all slides from an existing Slick JS carousel
     * @param {String} slidesObj Target slide container
     */
    var _deleteAllSlides = function (slidesObj) {
        // We only need to remove slides if carousel is initialized
        if (slidesObj.is('.slick-initialized')) {
            slidesObj.slick('slickRemove', null, null, true);
        }
    }

    /**
     * @return {String} videoID or null if video not found
     */
    var _getVideoID = function() {
        return (_.imgData['video'] != null) ? _.imgData['video'].data : null;
    }

    /**
     * Apply custom style to slide navigation for video slides
     * Pre-req: showThumbnails = false and videoSelector found in DOM
     */
    var _styleVideoDot = function() {
        // Keep checking until slick has completed adding dot navigation
        var dotsExist = setInterval(function() {
            if ($('.loupe-main .slick-dots').length) {
                var vidSlideDot = $('.loupe-main .slick-dots li').get(-1);
                $(vidSlideDot).addClass('slick-is-video');
                clearInterval(dotsExist);
            }
        }, 100);
    }

    /**
     * Add video and playback controls
     * Pre-req: videoSelector has to exist
     * @param {string} host youtube, vimeo or scene7
     * @param {string} id Unique identifier for video
     */
    var _loadVideo = function(host, id) {
        var loadVideoEvent = function () {
            // If video is already loaded, just play video
            if ($(config.videoSelector).find('#loupe-video').length < 1) {
                // Init correct viewer based on current host
                if (host == 'youtube') {
                    _loadYouTubeVideo(id);
                } else if (host == 'vimeo') {
                    _loadVimeoVideo(id);
                } else if (host == 'scene7') {
                    _loadS7Video(id);
                }
            }
        };

        // Keep checking until slick has completed adding video slides
        if (_getVideoID() != null && $(config.videoSelector).length > 0) {
            var videoSlideExists = setInterval(function() {
                // If scrollOnDesktop = true, don't wait for click event to load video
                if ($(config.scrollOnDesktop)) {
                    loadVideoEvent();
                } else {
                    // If not scrolling, apply 'afterChange' listener for slick sliders
                    $(config.slideContainer).on('afterChange', function(event, slick, currentSlide, nextSlide){
                        // Trigger 'play' if this is a video slide
                        if ($('.loupe__slide').eq(currentSlide).hasClass('loupe__slide--video')) {
                            loadVideoEvent();
                        }
                    });
                    // Add click event to video navigation
                    $(config.navSlide).on('click.loupeVideo', loadVideoEvent);
                }
                // Add event to slick afterChange event, capturing any navigation to slide
                clearInterval(videoSlideExists);
            }, 100);
        }
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
    var _appendVideoSlides = function (imgData) {
        var $slides = $(config.slideContainer);
        var $nav = $(config.navContainer);
        var videoID = _getVideoID();

        // TODO: Optimize this block to be more DRY
        if (videoID && videoID !== null) {
            var vidSlideHTML = '<div class="loupe__slide loupe__slide--video"><div class="embed-responsive--16-9"></div></div>';

            if (imgData['video'].host == 'youtube') {
                var vidNavSlide = '<div class="loupe-nav__item loupe-nav__item--video">' +
                    '<img src="https://img.youtube.com/vi/' + videoID + '/hqdefault.jpg" class="loupe-nav__img" ' +
                    'alt="Video thumbnail: ' + imgData.colorValue + ' ' + imgData.alt + '" />' +
                    '</div>';

                // Add video slick slide with video placeholder, add navigation slide
                _addSlide($slides, vidSlideHTML);
                _addSlide($nav, vidNavSlide, _styleVideoDot);

                // Load video
                _loadVideo(imgData["video"].host, videoID);

            } else if (imgData["video"].host == "vimeo") {
                var vidNavSlide;
                // If video is hosted by Vimeo, get thumbnail URL, which is different than the videoID and requires an API call
                $.getJSON(
                    'https://www.vimeo.com/api/v2/video/' + videoID + '.json?callback=?', {
                        format: 'json'
                    },
                    function (data) {
                        vidNavSlide = '<div class="loupe-nav__item loupe-nav__item--video">' +
                            '<img src="https://i.vimeocdn.com/video/' + data[0].thumbnail_large + '" ' +
                            'class="loupe-nav__img" ' +
                            'alt="Video thumbnail: ' + imgData.colorValue + ' ' + imgData.alt + '" />' +
                            '</div>';
                        // Add navigation slide once data is available
                        _addSlide($nav, vidNavSlide, _styleVideoDot);
                    }
                );

                // Add video slick slide with video placeholder (does not depend on json and can fire asynchronously)
                _addSlide($slides, vidSlideHTML);

                // Load video
                _loadVideo(imgData['video'].host, videoID);

            } else if (imgData['video'].host == 'scene7') {
                var vidNavSlide = '<div class="loupe-nav__item loupe-nav__item--video">' +
                    '<img src="https://s7d2.scene7.com/is/image/ColumbiaSportswear2/' + videoID + '?wid=' + config.defaultWidth + '" class="loupe-nav__img" ' +
                    'alt="Video thumbnail: ' + imgData.colorValue + ' ' + imgData.alt + '" />' +
                    '</div>';

                // Add video slick slide with video placeholder, add navigation slide
                _addSlide($slides, vidSlideHTML);
                _addSlide($nav, vidNavSlide, _styleVideoDot);

                // Load video
                _loadVideo(imgData['video'].host, videoID);
            }
        }
    }
    /**
     * When the actual number of slides is less than the max number of
     * navigation slides, adjust the nav height (desktop only)
     * @param {Object} navObj Target container for navigation slides
     * @param {Integer} numSlides Number of slides in the nav
     * @param {Integer} maxSlides Maximum slides to show in mobile navigation
     */
    var _resetNavDimensions = function (navObj, maxSlides) {
        // Get the total slide count
        var numSlides = $(navObj).find('.loupe-nav__item').length;
        var slideHeight = $('.loupe-nav__item').first().outerHeight(true);

        if (numSlides > maxSlides) {
            navObj.slick('setOption', 'slidesToShow', maxSlides, true);
        } else {
            $(navObj).slick('setOption', 'slidesToShow', numSlides, true)
                .on('setPosition', function(event, slick) {
                    slick.$list.height(slideHeight * numSlides);
                });
        }
    }

    /**
     * 
     */
    var _setCompactMode = function () {
        // If scroll mode is detected, you have to first reinit slick
        if (config.scrollOnDesktop) {
            _reinitSlick();
        }
        // TODO: Update function to omit unneeded component; for now, we're just hiding it
        $(config.navContainer).hide();

        // Use custom dot navigation
        $(config.slideContainer).slick('setOption', 'dots', true, true);
        if (_getVideoID() !== null) {
            _styleVideoDot();
        }

        // Turn off video scroll event listeners
        $(window).off('scroll.loupeVideo');
    }

    /**
     * 
     */
    var _unsetCompactMode = function () {
        $(config.navContainer).show();
        $(config.navContainer).slick('reinit');
        $(config.slideContainer).slick('setOption', 'dots', false, true);
    }

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
     * Scrolling utility function used in scollOnDesktop mode
     * @param {Object} element Scrolling DOM element we're watching for in viewport
     * @param {Boolean} entirelyInView If true, function returns true only when entire element is in view
     * @returns {Boolean}
     */
    var _isScrolledIntoView = function (element, entirelyInView) {
        var pageTop = $(window).scrollTop();
        var pageBottom = pageTop + $(window).height();
        var elementTop = $(element).offset().top;
        var elementBottom = elementTop + $(element).height();

        if (entirelyInView === true) {
            return ((pageTop < elementTop) && (pageBottom > elementBottom));
        } else {
            return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
        }
    }

    //-------------------- MAIN FUNCTIONS --------------------//
    /**
     * Activate 'magnifying glass' effect.
     * Pre-requisite: HTML must follow a template
     * @access public
     * @param {String} selector DOM selector containing loupe images
     */
    var _magnify = function(selector) {
        var dragging = false;    // Distinguish touch from touchmove/"finger drag"
        $(config.slideContainer).off(); // Reset listeners
        $(config.slideContainer)
            // Track both click and touchstart
            .on('click', selector, function(e) {
                dragging = false; // Reset default each time a new touchstart is detected
            })
            // Track mouseup and touchend
            .on('mouseup', selector, function(e) {
                if (!dragging) {
                    var imgURI = $(this).data('lgimg');
                    $(e.currentTarget).css('background-image', 'url(' + imgURI + ')');
                    $(e.currentTarget).toggleClass('is-active');
                }
            })
            .on('touchmove', selector, function(e) {
                // Track finger dragging on touch devices
                var magnified = e.currentTarget;
                dragging = true;
                if ($(magnified).hasClass('is-active')) {
                    e.preventDefault(); // Prevent scrolling when navigating in zoom mode
                    var touch = e.originalEvent.touches[0];
                    // Calculate magnified DOM element offsets since they are not explicitly defined in e.touches
                    if (touch.pageY >= $(magnified).offset().top && 
                        touch.pageY < $(magnified).offset().top + $(magnified).height() &&
                        touch.pageX >= $(magnified).offset().left && 
                        touch.pageX < $(magnified).offset().left + $(magnified).width()
                    ) {
                        x = (touch.pageX - $(magnified).offset().left) / $(magnified).width() * 100;
                        y = (touch.pageY - $(magnified).offset().top) / $(magnified).height() * 100;
                        magnified.style.backgroundPosition = x + '% ' + y + '%';
                    }
                }
            })
            .on('mousemove', selector, function(e) {
                // Track mouse movement on desktop
                var magnified = e.currentTarget;
                if ($(magnified).hasClass('is-active')) {
                    x = e.offsetX / magnified.offsetWidth * 100;
                    y = e.offsetY / magnified.offsetHeight * 100;
                    magnified.style.backgroundPosition = x + '% ' + y + '%';
                }
            })
            .on('mouseleave', selector, function () {
                $(e.currentTarget).removeClass('is-active');
            });
    };

    /**
     * Load carousel with image viewers; Sets up two carousels: 1) Main images 2) Navigation for images
     * @access public
     * @param {String} imgData JSON data containing image URLs
     */
    var _loadCarouselViewers = function (imgData) {
        // Define nav and viewer selectors from config
        var $slides = $(config.slideContainer);
        var $nav = $(config.navContainer);

        // reinitSlick will load slick sliders, only if slick isn't already initialized
        _reinitSlick();

        // Remove all slides from any existing carousels
        _deleteAllSlides($slides);
        _deleteAllSlides($nav);

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

        // Update navigation height based on how many slides should show
        _resetNavDimensions($nav, config.navCarouselOptions.slidesToShow);

        // Exception: do not initialize slides if scrolling
        if (config.scrollOnDesktop) {
            // Unslick main slides in preparation for scrolling
            $slides.slick('setOption', 'fade', false, true);
            $slides.slick('unslick');
            $slides.find('.loupe__slide').attr('style',''); // Temporary fix for Slick JS 1.6.0 bug

            // Make nav links slide to loupe-main slide
            $nav.on('click.loupeScrollMode', '.loupe-nav__item', function() {
                var idx = $(this).index();
                var $scrollTarget = $('.loupe__slide').get(idx);

                // Anchor sticky DOM containers while product slides scroll
                $nav.addClass('sticky-top');
                $('html, body').animate({
                    scrollTop: $($scrollTarget).offset().top
                }, 500);
                // Prevent scrolling from locking up after scrollTop animation
                $(window).bind('mousewheel', function() {
                    $('html, body').stop();
                });
            });
        } else {
            // Remove any existing scroll mode listeners
            $nav.off('click.loupeScrollMode');
        }
    };

    /**
     * Load YouTube video
     * @param {String} videoID YouTube Video ID
     * @param {Object} target Target DOM element
     * @return void
     */
    var _loadYouTubeVideo = function (videoID) {
        var scriptURL = 'https://www.youtube.com/iframe_api';
        var $target = $('.embed-responsive--16-9');
        var width = config.defaultWidth;
        var height = config.defaultHeight;
        var videoHTML =
            '<iframe id="loupevid_' + videoID + '" type="text/html" width="' + width + '" height="' + height + '" ' +
            'src="https://www.youtube.com/embed/' + videoID + '?color=white&rel=0&showinfo=0&enablejsapi=1" frameborder="0" allowFullScreen="allowFullScreen">' +
            "</iframe>";

        // Load video into slide
        $target.html(videoHTML);

        _createYTPlayer = function() {
            // Add YT.Player to global collection of player objects
            return _.YTPlayers[videoID] = new YT.Player('loupevid_' + videoID, {
                events: {
                    onReady: onPlayerReady
                }
            });
        }

        // Use API with existing YouTube player
        // TODO: Add check for to see if specific YT.Player exists with current ID
        if (typeof window.onYouTubeIframeAPIReady == 'undefined' || typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined') {
            var tag = document.createElement('script');
            var firstScriptTag = document.getElementsByTagName('script')[0];
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = function () {
                _createYTPlayer();
            };
        }
        // onYouTubeIframeAPIReady is already defined; just add a new YTPlayer
        else {
            _createYTPlayer();
        }

        // The API will call this function when the video player is ready.
        window.onPlayerReady = function (event) {
            // Setup click/navigation event that can pause videos when the iframe loses "focus"
            $(config.navItemSelector)
                .not(config.navVideoSelector)
                .on('click', function () {
                    _.YTPlayers[videoID].pauseVideo();
                });

            // Slick change to non-video nav item to pause
            $(config.slideContainer).on('afterChange', function(event, slick, currentSlide, nextSlide){
                _.YTPlayers[videoID].pauseVideo();
            });

            // Click on to video nav item to play
            $(config.navVideoSelector)
                .off('click.loupeVideo')
                .on('click', function () {
                    _.YTPlayers[videoID].playVideo();
                });

            // Slick change to video nav item to play
            $(config.slideContainer).on('afterChange', function(event, slick, currentSlide, nextSlide){
                // Trigger 'play' if this is a video slide
                if ($('.loupe__slide').eq(currentSlide).hasClass('loupe__slide--video')) {
                    _.YTPlayers[videoID].playVideo();
                }
            });

            // Setup play/pause on scroll if scrollOnDesktop == true
            if (config.scrollOnDesktop) {
                $(window).on('scroll.loupeVideo', function() {
                    if (_isScrolledIntoView($('.loupe__slide--video', false))) {
                        _.YTPlayers[videoID].playVideo();
                    } else {
                        _.YTPlayers[videoID].pauseVideo();
                    }
                });
            }
        };

        return false;
    };

    /**
     * Load Vimeo video
     * @param {String} videoID Vimeo Video ID
     */
    var _loadVimeoVideo = function (videoID) {
        var scriptURL = 'https://player.vimeo.com/api/player.js';
        var $target = $('.embed-responsive--16-9');
        var width = config.defaultWidth;
        var $navItem = $(config.navItemSelector);
        var $navItemVideo = $(config.navVideoSelector);
        var videoOptions = {
            id: videoID,
            width: width,
            loop: false
        };

        // Only load Vimeo script if it is not found (vimeoPlayer defined)
        if (typeof vimeoPlayer == 'undefined') {
            var tag = document.createElement('script');
            var firstScriptTag = document.getElementsByTagName('script')[0];

            // Wait for remote script to load before assigning event listeners
            tag.onload = function () {
                // Clear placeholder image before loading video
                $target.html('');

                // Create vimeo player
                var vimeoPlayer = new Vimeo.Player($target, videoOptions);

                // Click on non-video nav item to pause
                $(config.navItemSelector)
                    .not(config.navVideoSelector)
                    .on('click', function () {
                        vimeoPlayer.pause();
                    });

                // Slick change to non-video nav item to pause
                $(config.slideContainer).on('afterChange', function(event, slick, currentSlide, nextSlide){
                    vimeoPlayer.pause();
                });

                // Click on video nav item to play]
                $(config.navVideoSelector)
                    .off('click.loupeVideo')
                    .on('click', function () {
                        vimeoPlayer.play();
                    });

                // Slick change to video nav item to play
                $(config.slideContainer).on('afterChange', function(event, slick, currentSlide, nextSlide){
                    // Trigger 'play' if this is a video slide
                    if ($('.loupe__slide').eq(currentSlide).hasClass('loupe__slide--video')) {
                        vimeoPlayer.play();
                    }
                });

                // Setup play/pause on scroll if scrollOnDesktop == true
                if (config.scrollOnDesktop) {
                    $(window).on('scroll.loupeVideo', function() {
                        if (_isScrolledIntoView($('.loupe__slide--video', false))) {
                            vimeoPlayer.play();
                        } else {
                            vimeoPlayer.pause();
                        }
                    });
                }
            };
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    };

    /**
     * Load Scene7 video
     */
    var _loadS7Video = function (videoID) {
        var scriptURL = 'https://s7d2.scene7.com/s7viewers/html5/js/VideoViewer.js';
        var $target = $('.embed-responsive--16-9');
        var s7ServerURL = 'https://s7d2.scene7.com/is/image/';
        var s7VideoServerURL = 'https://s7d2.scene7.com/is/content/';
        var s7basePath = 'ColumbiaSportswear2/';
        var s7contentURL = 'https://s7d2.scene7.com/skins/';
        var s7emailURL = 'https://s7d2.scene7.com/s7/emailFriend';
        var s7ConfigPath = 'Scene7SharedAssets/Universal_HTML5_Video';

        // Only load Scene7 script if it is not found
        // Loads the Scene7 IFrame Player API code asynchronously.
        if (typeof s7_videoview == 'undefined') {
            var tag = document.createElement('script');
            var firstScriptTag = document.getElementsByTagName('script')[0];

            // Append div with id='loupe-viewer' as container for s7 video
            $target.attr('id', 'loupe-viewer');

            // Clear placeholder image before loading video
            $target.html('');

            // Initiate viewer once script is loaded
            tag.onload = function () {
                var s7_videoview = new s7viewers.VideoViewer({
                    containerId: 'loupe-viewer',
                    params: {
                        serverurl: s7ServerURL,
                        asset: s7basePath + videoID,
                        contenturl: s7contentURL,
                        config: s7ConfigPath,
                        autoplay: '1',
                        loop: '1',
                        emailurl: s7emailURL,
                        videoserverurl: s7VideoServerURL
                    }
                }).init();

                // Simulate click on s7playPause button
                // Click on non-video nav item to pause
                $(config.navItemSelector)
                    .not(config.navVideoSelector)
                    .on('click', function () {
                        // Class generated by S7, selected="false" equivalent to pauseBtn
                        $('#loupe-viewer_playPauseButton[selected="false"]').click();
                    });

                // Slick change to non-video nav item to pause
                $(config.slideContainer).on('afterChange', function(event, slick, currentSlide, nextSlide){
                    $('#loupe-viewer_playPauseButton[selected="false"]').click();
                });

                // Click on video nav item to play
                $(config.navVideoSelector)
                    .off('click.loupeVideo')
                    .on('click', function () {
                        // Class generated by S7, selected="true" equivalent to playBtn
                        $('#loupe-viewer_playPauseButton[selected="true"]').click();
                    });

                // Slick change to video nav item to play
                $(config.slideContainer).on('afterChange', function(event, slick, currentSlide, nextSlide){
                    // Trigger 'play' if this is a video slide
                    if ($('.loupe__slide').eq(currentSlide).hasClass('loupe__slide--video')) {
                        $('#loupe-viewer_playPauseButton[selected="true"]').click();
                    }
                });

                // Setup play/pause on scroll if scrollOnDesktop == true
                if (config.scrollOnDesktop) {
                    $(window).on('scroll.loupeVideo', function() {
                        if (_isScrolledIntoView($('.loupe__slide--video', false))) {
                            $('#loupe-viewer_playPauseButton[selected="true"]').click(); // Play
                        } else {
                            $('#loupe-viewer_playPauseButton[selected="false"]').click(); // Pause
                        }
                    });
                }
            };
            tag.src = scriptURL;
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    };

    return {
        init: init,
        YTPlayers: YTPlayers
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
    //   "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a1",
    //   "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2"
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

  // Test defaults
  $(".swatch1.js-mode-default").on("click", function() {
    Loupe.init({}, imgData);
  });
  $(".swatch2.js-mode-default").on("click", function() {
    Loupe.init({}, imgData_vimeo);
  });
  $(".swatch3.js-mode-default").on("click", function() {
    Loupe.init({}, imgData_s7);
  });

  // Test compact mode
  $(".swatch1.js-mode-compact").on("click", function() {
    Loupe.init({ showThumbnails: false }, imgData);
  });
  $(".swatch2.js-mode-compact").on("click", function() {
    Loupe.init({ showThumbnails: false }, imgData_vimeo);
  });
  $(".swatch3.js-mode-compact").on("click", function() {
    Loupe.init({ showThumbnails: false }, imgData_s7);
  });

  // Test scrollOnDesktop
  $(".swatch1.js-mode-scroll").on("click", function() {
    Loupe.init(
      {
        showThumbnails: true,
        scrollOnDesktop: true
      },
      imgData
    );
  });
  $(".swatch2.js-mode-scroll").on("click", function() {
    Loupe.init(
      {
        showThumbnails: true,
        scrollOnDesktop: true
      },
      imgData_vimeo
    );
  });
  $(".swatch3.js-mode-scroll").on("click", function() {
    Loupe.init(
      {
        showThumbnails: true,
        scrollOnDesktop: true
      },
      imgData_s7
    );
  });
});