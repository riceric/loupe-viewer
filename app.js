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
              maxTabletWidth: 1023,
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
                  mobileFirst: true,
                  slidesToShow: 6,
                  focusOnSelect: true,
                  swipe: true,
                  vertical: false,
                  verticalSwiping: false,
                  asNavFor: ".loupe-main", // TODO: Make this configurable
                  infinite: false,

                  responsive: [{
                      breakpoint: 1023,
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

          // Load images for selected product variant
          loadCarouselViewers(imgJson);

          // Initiate loupe mode on image
          magnify(config.loupeSelector);
      } else {
          throw "Loupe.init: No image data found."
      }
  };

  /**
   * Activate 'magnifying glass' effect.
   * Pre-requisite: HTML must follow a template
   * @access public
   * @param {String} selector DOM selector containing loupe images
   */
  var magnify = function (selector) {
      $(selector).on({
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
      });
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

      var videoID = (imgData["video"] != null) ? imgData["video"].data : null;
      // numSlides: Hardcoding 1 for video until support is added for multiple videos
      var numSlides = Object.keys(imgData.images).length + 1;

      // Load slick sliders only if slick hasn't already been initialized
      $slides.not(".slick-initialized").slick(config.viewerCarouselOptions);
      $nav.not(".slick-initialized").slick(config.navCarouselOptions);

      // Remove all slides from any existing slides
      if ($slides.is(".slick-initialized")) {
          $slides.slick("slickRemove", null, null, true);
      }
      if ($nav.is(".slick-initialized")) {
          $nav.slick("slickRemove", null, null, true);
      }

      // If thumbnails are turned off, do not render the nav slick component
      if (!config.showThumbnails) {
          // TODO: Update function to omit unneeded component; for now, we're just hiding it
          $nav.hide();
          $slides.slick(
              "setOption", {
                  dots: true
              },
              true
          );
      } else {
          $nav.show();
          $slides.slick(
              "setOption", {
                  dots: false
              },
              true
          );
      }

      // Fix bug where navigation position incorrectly renders when resizing window
      $(window).on('resize', function () {
          $nav.slick("reinit");
      });

      // Re-center slides based on how many slides should show
      if (numSlides > maxSlides) {
          $nav.slick(
              "setOption", {
                  slidesToShow: maxSlides
              }, true
          );
      } else {
          $nav.slick(
              "setOption", {
                  slidesToShow: numSlides
              }, true
          );
      }

      // Setup carousel slides
      for (var i in imgData["images"]) {
          $slides.slick(
              "slickAdd",
              '<div class="loupe__slide"><figure class="loupe" data-lgimg="' + imgData.images[i] + dimParamHQ + '"><div id="loupe__lens"><img src="' +
              imgData.images[i] + dimParamDefault + '" class="loupe__img d-block"></div></figure></div>'
          );
          $nav.slick(
              "slickAdd",
              '<div class="loupe-nav__item"><img src="' + imgData.images[i] + dimParamDefault + '" class="loupe-nav__img" /></div>'
          );
      }

      // Append video slide to main carousel and nav carousel
      // TODO: Optimize this block to be more DRY
      if (videoID && videoID !== null) {
          if (imgData["video"].host == "youtube") {
              // Add video slick slide with video placeholder
              $slides.slick(
                  "slickAdd",
                  '<div class="loupe__slide loupe__slide--video"><div class="embed-responsive--16-9"></div></div>'
              );

              // Add ability to custom style to video slick dot
              var newVideoSlideDot = $(".loupe-main .slick-dots li").get(-1);
              $(newVideoSlideDot).addClass("slick-is-video");

              // Add navigation slick slide for video
              $nav.slick(
                  "slickAdd",
                  '<div class="loupe-nav__item loupe-nav__item--video"><img src="https://img.youtube.com/vi/' +
                  videoID + '/hqdefault.jpg" class="loupe-nav__img" /></div>'
              );

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
                  "https://www.vimeo.com/api/v2/video/" + videoID + ".json?callback=?", {
                      format: "json"
                  },
                  function (data) {
                      // Add video slick slide with video placeholder
                      $slides.slick(
                          "slickAdd",
                          '<div class="loupe__slide loupe__slide--video"><div class="embed-responsive--16-9"></div></div>'
                      );

                      // Add ability to custom style to video slick dot
                      var newVideoSlideDot = $(".loupe-main .slick-dots li").get(-1);
                      $(newVideoSlideDot).addClass("slick-is-video");

                      // Add navigation slick slide for video
                      $nav.slick(
                          "slickAdd",
                          '<div class="loupe-nav__item loupe-nav__item--video"><img src="https://i.vimeocdn.com/video/' +
                          data[0].thumbnail_large + '" class="loupe-nav__img" /></div>'
                      );

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
              // Add video slick slide with video placeholder
              $slides.slick(
                  "slickAdd",
                  '<div class="loupe__slide loupe__slide--video"><div class="embed-responsive--16-9"></div></div>'
              );

              // Add ability to custom style to video slick dot
              var newVideoSlideDot = $(".loupe-main .slick-dots li").get(-1);
              $(newVideoSlideDot).addClass("slick-is-video");

              // Add navigation slick slide for video
              $nav.slick(
                  "slickAdd",
                  '<div class="loupe-nav__item loupe-nav__item--video"><img src="https://s7d2.scene7.com/is/image/ColumbiaSportswear2/' +
                  videoID +
                  '?wid=' + config.defaultWidth + '" class="loupe-nav__img" /></div>'
              );

              // Init Scene7 video viewer from thumbnail and dot
              $(config.navVideoSelector).on("click.togglePlayback", function () {
                  if ($(".loupe__item--video").find("#loupe-video").length < 1) {
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
  var loadYouTubeVideo = function (videoID) {
      var scriptURL = "https://www.youtube.com/iframe_api";
      var $target = $(".embed-responsive--16-9");
      var width = config.defaultWidth;
      var height = config.defaultHeight;
      var videoHTML =
          '<iframe id="loupe-video" type="text/html" width="' + width + '" height="' + height + '" ' +
          'src="https://www.youtube.com/embed/' + videoID + '?color=white&rel=0&showinfo=0&enablejsapi=1" frameborder="0">' +
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
      init: init
  };
})();

/* ########## INITIALIZATION ########## */
$(function () {
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
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_351_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2"
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
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_b",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_a1",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/RM2023_805_f",
      "https://s7d5.scene7.com/is/image/ColumbiaSportswear2/1792132_039_a2"
    ],
    video: {
      data: "sor16-web",
      host: "scene7"
    }
  };

  $(".swatch1").on("click", function () {
    Loupe.init({
        showThumbnails: false,
      },
      imgData
    );
  });
  $(".swatch2").on("click", function () {
    Loupe.init({
        showThumbnails: false,
      },
      imgData_vimeo
    );
  });
  $(".swatch3").on("click", function () {
    Loupe.init({
        showThumbnails: false,
      },
      imgData_s7
    );
  });
  $(".swatch4").on("click", function () {
    Loupe.init({
      },
      imgData_yt2
    );
  });
});