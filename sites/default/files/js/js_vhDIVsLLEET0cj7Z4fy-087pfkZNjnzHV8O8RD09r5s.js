/*

Quicksand 1.3

Reorder and filter items with a nice shuffling animation.

Copyright (c) 2010 Jacek Galanciak (razorjack.net) and agilope.com
Big thanks for Piotr Petrus (riddle.pl) for deep code review and wonderful docs & demos.

Dual licensed under the MIT and GPL version 2 licenses.
http://github.com/jquery/jquery/blob/master/MIT-LICENSE.txt
http://github.com/jquery/jquery/blob/master/GPL-LICENSE.txt

Project site: http://razorjack.net/quicksand
Github site: http://github.com/razorjack/quicksand

 */

(function($) {
  $.fn.quicksand = function(collection, customOptions) {
    var options = {
      duration : 750,
      easing : 'swing',
      attribute : 'data-id',        // attribute to recognize same items within source and dest
      adjustHeight : 'auto',        // 'dynamic' animates height during shuffling (slow), 'auto' adjusts it
                                    // before or after the animation, false leaves height constant
      adjustWidth : 'auto',         // 'dynamic' animates width during shuffling (slow), 
                                    // 'auto' adjusts it before or after the animation, false leaves width constant
      useScaling : false,           // enable it if you're using scaling effect
      enhancement : function(c) {}, // Visual enhacement (eg. font replacement) function for cloned elements
      selector : '> *',
      atomic : false,
      dx : 0,
      dy : 0,
      maxWidth : 0,
      retainExisting : true         // disable if you want the collection of items to be replaced completely by incoming items.
    };
    $.extend(options, customOptions);

    // Got IE and want scaling effect? Kiss my ass.
    if ($.browser.msie || (typeof ($.fn.scale) == 'undefined')) {
      options.useScaling = false;
    }

    var callbackFunction;
    if (typeof (arguments[1]) == 'function') {
      callbackFunction = arguments[1];
    } else if (typeof (arguments[2] == 'function')) {
      callbackFunction = arguments[2];
    }

    return this.each(function(i) {
      var val;
      var animationQueue = []; // used to store all the animation params before starting the animation;
      // solves initial animation slowdowns
      var $collection;
      if (typeof(options.attribute) == 'function') {
        $collection = $(collection);
      } else {
        $collection = $(collection).filter('[' + options.attribute + ']').clone(); // destination (target) collection
      }
      var $sourceParent = $(this); // source, the visible container of source collection
      var sourceHeight = $(this).css('height'); // used to keep height and document flow during the animation
      var sourceWidth = $(this).css('width'); // used to keep  width and document flow during the animation
      var destHeight, destWidth;
      var adjustHeightOnCallback = false;
      var adjustWidthOnCallback = false;
      var offset = $($sourceParent).offset(); // offset of visible container, used in animation calculations
      var offsets = []; // coordinates of every source collection item
      var $source = $(this).find(options.selector); // source collection items
      var width = $($source).innerWidth(); // need for the responsive design

      // Replace the collection and quit if IE6
      if ($.browser.msie && parseInt($.browser.version, 10) < 7) {
        $sourceParent.html('').append($collection);
        return;
      }

      // Gets called when any animation is finished
      var postCallbackPerformed = 0; // prevents the function from being called more than one time
      var postCallback = function() {
        $(this).css('margin', '').css('position', '').css('top', '').css('left', '').css('opacity', '');
        if (!postCallbackPerformed) {
          postCallbackPerformed = 1;

          if (!options.atomic) {
            // hack: used to be: $sourceParent.html($dest.html()); 
            // put target HTML into visible source container  
            // but new webkit builds cause flickering when replacing the collections
            var $toDelete = $sourceParent.find(options.selector);
            if (!options.retainExisting) {
              $sourceParent.prepend($dest.find(options.selector));
              $toDelete.remove();
            } else {
              // Avoid replacing elements because we may have already altered items in significant
              // ways and it would be bad to have to do it again. (i.e. lazy load images) 
              // But $dest holds the correct ordering. So we must re-sequence items in $sourceParent to match.
              var $keepElements = $([]);
              $dest.find(options.selector).each(function(i) {
                var $matchedElement = $([]);
                if (typeof (options.attribute) == 'function') {
                  var val = options.attribute($(this));
                  $toDelete.each(function() {
                    if (options.attribute(this) == val) {
                      $matchedElement = $(this);
                      return false;
                    }
                  });
                } else {
                  $matchedElement = $toDelete.filter(
                    '[' + options.attribute + '="'+ 
                    $(this).attr(options.attribute) + '"]');
                }
                if ($matchedElement.length > 0) {
                  // There is a matching element in the $toDelete list and in $dest
                  // list, so make sure it is in the right location within $sourceParent
                  // and put it in the list of elements we need to not delete.
                  $keepElements = $keepElements.add($matchedElement);
                  if (i === 0) {
                    $sourceParent.prepend($matchedElement);
                  } else {
                    $matchedElement.insertAfter($sourceParent.find(options.selector).get(i - 1));
                  }
                }
              });
              // Remove whatever is remaining from the DOM
              $toDelete.not($keepElements).remove();
            }

            if (adjustHeightOnCallback) {
              $sourceParent.css('height', destHeight);
            }
            if (adjustWidthOnCallback) {
              $sourceParent.css('width', sourceWidth);
            }
          }
          options.enhancement($sourceParent); // Perform custom visual enhancements on a newly replaced collection
          if (typeof callbackFunction == 'function') {
            callbackFunction.call(this);
          }
        }

        if (false === options.adjustHeight) {
          $sourceParent.css('height', 'auto');
        }

        if (false === options.adjustWidth) {
          $sourceParent.css('width', 'auto');
        }
      };

      // Position: relative situations
      var $correctionParent = $sourceParent.offsetParent();
      var correctionOffset = $correctionParent.offset();
      if ($correctionParent.css('position') == 'relative') {
        if ($correctionParent.get(0).nodeName.toLowerCase() != 'body') {
          correctionOffset.top += (parseFloat($correctionParent.css('border-top-width')) || 0);
          correctionOffset.left += (parseFloat($correctionParent.css('border-left-width')) || 0);
        }
      } else {
        correctionOffset.top -= (parseFloat($correctionParent.css('border-top-width')) || 0);
        correctionOffset.left -= (parseFloat($correctionParent.css('border-left-width')) || 0);
        correctionOffset.top -= (parseFloat($correctionParent.css('margin-top')) || 0);
        correctionOffset.left -= (parseFloat($correctionParent.css('margin-left')) || 0);
      }

      // perform custom corrections from options (use when Quicksand fails to detect proper correction)
      if (isNaN(correctionOffset.left)) {
        correctionOffset.left = 0;
      }
      if (isNaN(correctionOffset.top)) {
        correctionOffset.top = 0;
      }

      correctionOffset.left -= options.dx;
      correctionOffset.top -= options.dy;

      // keeps nodes after source container, holding their position
      $sourceParent.css('height', $(this).height());
      $sourceParent.css('width', $(this).width());

      // get positions of source collections
      $source.each(function(i) {
        offsets[i] = $(this).offset();
      });

      // stops previous animations on source container
      $(this).stop();
      var dx = 0;
      var dy = 0;
      $source.each(function(i) {
        $(this).stop(); // stop animation of collection items
        var rawObj = $(this).get(0);
        if (rawObj.style.position == 'absolute') {
          dx = -options.dx;
          dy = -options.dy;
        } else {
          dx = options.dx;
          dy = options.dy;
        }

        rawObj.style.position = 'absolute';
        rawObj.style.margin = '0';

        if (!options.adjustWidth) {
          rawObj.style.width = (width + 'px'); // sets the width to the current element
          // with even if it has been changed
          // by a responsive design
        }

        rawObj.style.top = (offsets[i].top- parseFloat(rawObj.style.marginTop) - correctionOffset.top + dy) + 'px';
        rawObj.style.left = (offsets[i].left- parseFloat(rawObj.style.marginLeft) - correctionOffset.left + dx) + 'px';

        if (options.maxWidth > 0 && offsets[i].left > options.maxWidth) {
          rawObj.style.display = 'none';
        }
      });

      // create temporary container with destination collection
      var $dest = $($sourceParent).clone();
      var rawDest = $dest.get(0);
      rawDest.innerHTML = '';
      rawDest.setAttribute('id', '');
      rawDest.style.height = 'auto';
      rawDest.style.width = $sourceParent.width() + 'px';
      $dest.append($collection);
      // Inserts node into HTML. Note that the node is under visible source container in the exactly same position
      // The browser render all the items without showing them (opacity: 0.0) No offset calculations are needed, 
      // the browser just extracts position from underlayered destination items and sets animation to destination positions.
      $dest.insertBefore($sourceParent);
      $dest.css('opacity', 0.0);
      rawDest.style.zIndex = -1;

      rawDest.style.margin = '0';
      rawDest.style.position = 'absolute';
      rawDest.style.top = offset.top - correctionOffset.top + 'px';
      rawDest.style.left = offset.left - correctionOffset.left + 'px';

      if (options.adjustHeight === 'dynamic') {
        // If destination container has different height than source container the height can be animated,
        // adjusting it to destination height
        $sourceParent.animate({ height : $dest.height() }, options.duration, options.easing);
      } else if (options.adjustHeight === 'auto') {
        destHeight = $dest.height();
        if (parseFloat(sourceHeight) < parseFloat(destHeight)) {
          // Adjust the height now so that the items don't move out of the container
          $sourceParent.css('height', destHeight);
        } else {
          // Adjust later, on callback
          adjustHeightOnCallback = true;
        }
      }

      if (options.adjustWidth === 'dynamic') {
        // If destination container has different width than source container the width can be animated, 
        // adjusting it to destination width
        $sourceParent.animate({ width : $dest.width() }, options.duration, options.easing);
      } else if (options.adjustWidth === 'auto') {
        destWidth = $dest.width();
        if (parseFloat(sourceWidth) < parseFloat(destWidth)) {
          // Adjust the height now so that the items don't move out of the container
          $sourceParent.css('width', destWidth);
        } else {
          // Adjust later, on callback
          adjustWidthOnCallback = true;
        }
      }

      // Now it's time to do shuffling animation. First of all, we need to identify same elements within
      // source and destination collections
      $source.each(function(i) {
        var destElement = [];
        if (typeof (options.attribute) == 'function') {
          val = options.attribute($(this));
          $collection.each(function() {
            if (options.attribute(this) == val) {
              destElement = $(this);
              return false;
            }
          });
        } else {
          destElement = $collection.filter('[' + options.attribute + '="' + $(this).attr(options.attribute) + '"]');
        }
        if (destElement.length) {
          // The item is both in source and destination collections. It it's under different position, let's move it
          if (!options.useScaling) {
            animationQueue.push({
              element : $(this), dest : destElement,
              style : {
                top : $(this).offset().top,
                left : $(this).offset().left,
                opacity : ""
              },
              animation : {
                top : destElement.offset().top - correctionOffset.top,
                left : destElement.offset().left - correctionOffset.left,
                opacity : 1.0
              }
            });
          } else {
            animationQueue.push({
              element : $(this), dest : destElement,
              style : {
                top : $(this).offset().top,
                left : $(this).offset().left,
                opacity : ""
              },
              animation : {
                top : destElement.offset().top - correctionOffset.top,
                left : destElement.offset().left - correctionOffset.left,
                opacity : 1.0,
                scale : '1.0'
              }
            });
          }
        } else {
          // The item from source collection is not present in destination collections.  Let's remove it
          if (!options.useScaling) {
            animationQueue.push({
              element : $(this),
              style : {
                top : $(this).offset().top,
                left : $(this).offset().left,
                opacity : ""
              },
              animation : {
                opacity : '0.0'
              }
            });
          } else {
            animationQueue.push({
              element : $(this),
              animation : {
                opacity : '0.0',
                style : {
                  top : $(this).offset().top,
                  left : $(this).offset().left,
                  opacity : ""
                },
                scale : '0.0'
              }
            });
          }
        }
      });

      $collection.each(function(i) {
        // Grab all items from target collection not present in visible source collection
        var sourceElement = [];
        var destElement = [];
        if (typeof (options.attribute) == 'function') {
          val = options.attribute($(this));
          $source.each(function() {
            if (options.attribute(this) == val) {
              sourceElement = $(this);
              return false;
            }
          });

          $collection.each(function() {
            if (options.attribute(this) == val) {
              destElement = $(this);
              return false;
            }
          });
        } else {
          sourceElement = $source.filter('[' + options.attribute + '="' + $(this).attr(options.attribute) + '"]');
          destElement = $collection.filter('[' + options.attribute + '="' + $(this).attr(options.attribute) + '"]');
        }

        var animationOptions;
        if (sourceElement.length === 0 && destElement.length > 0) {

          // No such element in source collection...
          if (!options.useScaling) {
            animationOptions = {opacity : '1.0'};
          } else {
            animationOptions = {opacity : '1.0', scale : '1.0'};
          }

          // Let's create it
          var d = destElement.clone();
          var rawDestElement = d.get(0);
          rawDestElement.style.position = 'absolute';
          rawDestElement.style.margin = '0';

          if (!options.adjustWidth) {
            // sets the width to the current element with even if it has been changed by a responsive design
            rawDestElement.style.width = width + 'px'; 
          }

          rawDestElement.style.top = destElement.offset().top - correctionOffset.top + 'px';
          rawDestElement.style.left = destElement.offset().left - correctionOffset.left + 'px';

          d.css('opacity', 0.0); // IE

          if (options.useScaling) {
            d.css('transform', 'scale(0.0)');
          }
          d.appendTo($sourceParent);

          if (options.maxWidth === 0 || destElement.offset().left < options.maxWidth) {
            animationQueue.push({element : $(d), dest : destElement,animation : animationOptions});
          }
        }
      });

      $dest.remove();
      if (!options.atomic) {
        options.enhancement($sourceParent); // Perform custom visual enhancements during the animation
        for (i = 0; i < animationQueue.length; i++) {
          animationQueue[i].element.animate(animationQueue[i].animation, options.duration, options.easing, postCallback);
        }
      } else {
        $toDelete = $sourceParent.find(options.selector);
        $sourceParent.prepend($dest.find(options.selector));
        for (i = 0; i < animationQueue.length; i++) {
          if (animationQueue[i].dest && animationQueue[i].style) {
            var destElement = animationQueue[i].dest;
            var destOffset = destElement.offset();

            destElement.css({
              position : 'relative',
              top : (animationQueue[i].style.top - destOffset.top),
              left : (animationQueue[i].style.left - destOffset.left)
            });

            destElement.animate({top : "0", left : "0"}, 
                                options.duration, 
                                options.easing, 
                                postCallback);
          } else {
            animationQueue[i].element.animate(animationQueue[i].animation, 
                                              options.duration, 
                                              options.easing,
                                              postCallback);
          }
        }
        $toDelete.remove();
      }
    });
  };
})(jQuery);;
  
jQuery(document).ready(function(){

	if ( jQuery( '.portfolio-item-hover-content' ).length && jQuery() ) {
	function hover_effect() {  
	jQuery('.portfolio-item-hover-content').hover(function() {
	         jQuery(this).find('div,a').stop(0,0).removeAttr('style');
	         jQuery(this).find('.hover-options').animate({opacity: 0.9}, 'fast');
	         jQuery(this).find('a').animate({"top": "60%" });
	    }, function() {
	         jQuery(this).find('.hover-options').stop(0,0).animate({opacity: 0}, "fast");
	         jQuery(this).find('a').stop(0,0).animate({"top": "150%"}, "slow");
	         jQuery(this).find('a.zoom').stop(0,0).animate({"top": "150%"}, "slow");
	       });
		}
	hover_effect();
	}


  var jQueryfilterType = jQuery('#filterable li.active a').attr('class');
  var jQueryholder = jQuery('ul.portfolio-items');
  var jQuerydata = jQueryholder.clone();
	jQuery('#filterable li a').click(function(e) {
		jQuery('#filterable li').removeClass('active');
		var jQueryfilterType = jQuery(this).attr('data-type');
		jQuery(this).parent().addClass('active');
		
		if (jQueryfilterType == 'all') {
			var jQueryfilteredData = jQuerydata.find('li');
		} 
		else {
			var jQueryfilteredData = jQuerydata.find('li[data-type~="' + jQueryfilterType + '"]');
		}

		jQueryholder.quicksand(jQueryfilteredData, {
			duration: 500,
			useScaling: false,
			adjustHeight:false,
			easing: 'swing',
			enhancement:function(){
				hover_effect(); 
			}},
			function() {
				jQuery("a[data-rel^='prettyPhoto'], a.prettyPhoto, a[rel^='prettyPhoto']").prettyPhoto({
						overlay_gallery: false
				});
			}
		);
		return false;
	});
});;
/* ------------------------------------------------------------------------
	Class: prettyPhoto
	Use: Lightbox clone for jQuery
	Author: Stephane Caron (http://www.no-margin-for-errors.com)
	Version: 3.1.5
------------------------------------------------------------------------- */
(function($) {
	$.prettyPhoto = {version: '3.1.5'};
	
	$.fn.prettyPhoto = function(pp_settings) {
		pp_settings = jQuery.extend({
			hook: 'rel', /* the attribute tag to use for prettyPhoto hooks. default: 'rel'. For HTML5, use "data-rel" or similar. */
			animation_speed: 'fast', /* fast/slow/normal */
			ajaxcallback: function() {},
			slideshow: 5000, /* false OR interval time in ms */
			autoplay_slideshow: false, /* true/false */
			opacity: 0.80, /* Value between 0 and 1 */
			show_title: true, /* true/false */
			allow_resize: true, /* Resize the photos bigger than viewport. true/false */
			allow_expand: true, /* Allow the user to expand a resized image. true/false */
			default_width: 500,
			default_height: 344,
			counter_separator_label: '/', /* The separator for the gallery counter 1 "of" 2 */
			theme: 'pp_default', /* light_rounded / dark_rounded / light_square / dark_square / facebook */
			horizontal_padding: 20, /* The padding on each side of the picture */
			hideflash: false, /* Hides all the flash object on a page, set to TRUE if flash appears over prettyPhoto */
			wmode: 'opaque', /* Set the flash wmode attribute */
			autoplay: true, /* Automatically start videos: True/False */
			modal: false, /* If set to true, only the close button will close the window */
			deeplinking: true, /* Allow prettyPhoto to update the url to enable deeplinking. */
			overlay_gallery: true, /* If set to true, a gallery will overlay the fullscreen image on mouse over */
			overlay_gallery_max: 30, /* Maximum number of pictures in the overlay gallery */
			keyboard_shortcuts: true, /* Set to false if you open forms inside prettyPhoto */
			changepicturecallback: function(){}, /* Called everytime an item is shown/changed */
			callback: function(){}, /* Called when prettyPhoto is closed */
			ie6_fallback: true,
			markup: '<div class="pp_pic_holder"> \
						<div class="ppt">&nbsp;</div> \
						<div class="pp_top"> \
							<div class="pp_left"></div> \
							<div class="pp_middle"></div> \
							<div class="pp_right"></div> \
						</div> \
						<div class="pp_content_container"> \
							<div class="pp_left"> \
							<div class="pp_right"> \
								<div class="pp_content"> \
									<div class="pp_loaderIcon"></div> \
									<div class="pp_fade"> \
										<a href="#" class="pp_expand" title="Expand the image">Expand</a> \
										<div class="pp_hoverContainer"> \
											<a class="pp_next" href="#">next</a> \
											<a class="pp_previous" href="#">previous</a> \
										</div> \
										<div id="pp_full_res"></div> \
										<div class="pp_details"> \
											<div class="pp_nav"> \
												<a href="#" class="pp_arrow_previous">Previous</a> \
												<p class="currentTextHolder">0/0</p> \
												<a href="#" class="pp_arrow_next">Next</a> \
											</div> \
											<p class="pp_description"></p> \
											<div class="pp_social">{pp_social}</div> \
											<a class="pp_close" href="#">Close</a> \
										</div> \
									</div> \
								</div> \
							</div> \
							</div> \
						</div> \
						<div class="pp_bottom"> \
							<div class="pp_left"></div> \
							<div class="pp_middle"></div> \
							<div class="pp_right"></div> \
						</div> \
					</div> \
					<div class="pp_overlay"></div>',
			gallery_markup: '<div class="pp_gallery"> \
								<a href="#" class="pp_arrow_previous">Previous</a> \
								<div> \
									<ul> \
										{gallery} \
									</ul> \
								</div> \
								<a href="#" class="pp_arrow_next">Next</a> \
							</div>',
			image_markup: '<img id="fullResImage" src="{path}" />',
			flash_markup: '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="{width}" height="{height}"><param name="wmode" value="{wmode}" /><param name="allowfullscreen" value="true" /><param name="allowscriptaccess" value="always" /><param name="movie" value="{path}" /><embed src="{path}" type="application/x-shockwave-flash" allowfullscreen="true" allowscriptaccess="always" width="{width}" height="{height}" wmode="{wmode}"></embed></object>',
			quicktime_markup: '<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" codebase="http://www.apple.com/qtactivex/qtplugin.cab" height="{height}" width="{width}"><param name="src" value="{path}"><param name="autoplay" value="{autoplay}"><param name="type" value="video/quicktime"><embed src="{path}" height="{height}" width="{width}" autoplay="{autoplay}" type="video/quicktime" pluginspage="http://www.apple.com/quicktime/download/"></embed></object>',
			iframe_markup: '<iframe src ="{path}" width="{width}" height="{height}" frameborder="no"></iframe>',
			inline_markup: '<div class="pp_inline">{content}</div>',
			custom_markup: '',
			social_tools: '<div class="twitter"><a href="http://twitter.com/share" class="twitter-share-button" data-count="none">Tweet</a><script type="text/javascript" src="http://platform.twitter.com/widgets.js"></script></div><div class="facebook"><iframe src="//www.facebook.com/plugins/like.php?locale=en_US&href={location_href}&amp;layout=button_count&amp;show_faces=true&amp;width=500&amp;action=like&amp;font&amp;colorscheme=light&amp;height=23" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:500px; height:23px;" allowTransparency="true"></iframe></div>' /* html or false to disable */
		}, pp_settings);
		
		// Global variables accessible only by prettyPhoto
		var matchedObjects = this, percentBased = false, pp_dimensions, pp_open,
		
		// prettyPhoto container specific
		pp_contentHeight, pp_contentWidth, pp_containerHeight, pp_containerWidth,
		
		// Window size
		windowHeight = $(window).height(), windowWidth = $(window).width(),

		// Global elements
		pp_slideshow;
		
		doresize = true, scroll_pos = _get_scroll();
	
		// Window/Keyboard events
		$(window).unbind('resize.prettyphoto').bind('resize.prettyphoto',function(){ _center_overlay(); _resize_overlay(); });
		
		if(pp_settings.keyboard_shortcuts) {
			$(document).unbind('keydown.prettyphoto').bind('keydown.prettyphoto',function(e){
				if(typeof $pp_pic_holder != 'undefined'){
					if($pp_pic_holder.is(':visible')){
						switch(e.keyCode){
							case 37:
								$.prettyPhoto.changePage('previous');
								e.preventDefault();
								break;
							case 39:
								$.prettyPhoto.changePage('next');
								e.preventDefault();
								break;
							case 27:
								if(!settings.modal)
								$.prettyPhoto.close();
								e.preventDefault();
								break;
						};
						// return false;
					};
				};
			});
		};
		
		/**
		* Initialize prettyPhoto.
		*/
		$.prettyPhoto.initialize = function() {
			
			settings = pp_settings;
			
			if(settings.theme == 'pp_default') settings.horizontal_padding = 16;
			
			// Find out if the picture is part of a set
			theRel = $(this).attr(settings.hook);
			galleryRegExp = /\[(?:.*)\]/;
			isSet = (galleryRegExp.exec(theRel)) ? true : false;
			
			// Put the SRCs, TITLEs, ALTs into an array.
			pp_images = (isSet) ? jQuery.map(matchedObjects, function(n, i){ if($(n).attr(settings.hook).indexOf(theRel) != -1) return $(n).attr('href'); }) : $.makeArray($(this).attr('href'));
			pp_titles = (isSet) ? jQuery.map(matchedObjects, function(n, i){ if($(n).attr(settings.hook).indexOf(theRel) != -1) return ($(n).find('img').attr('alt')) ? $(n).find('img').attr('alt') : ""; }) : $.makeArray($(this).find('img').attr('alt'));
			pp_descriptions = (isSet) ? jQuery.map(matchedObjects, function(n, i){ if($(n).attr(settings.hook).indexOf(theRel) != -1) return ($(n).attr('title')) ? $(n).attr('title') : ""; }) : $.makeArray($(this).attr('title'));
			
			if(pp_images.length > settings.overlay_gallery_max) settings.overlay_gallery = false;
			
			set_position = jQuery.inArray($(this).attr('href'), pp_images); // Define where in the array the clicked item is positionned
			rel_index = (isSet) ? set_position : $("a["+settings.hook+"^='"+theRel+"']").index($(this));
			
			_build_overlay(this); // Build the overlay {this} being the caller
			
			if(settings.allow_resize)
				$(window).bind('scroll.prettyphoto',function(){ _center_overlay(); });
			
			
			$.prettyPhoto.open();
			
			return false;
		}


		/**
		* Opens the prettyPhoto modal box.
		* @param image {String,Array} Full path to the image to be open, can also be an array containing full images paths.
		* @param title {String,Array} The title to be displayed with the picture, can also be an array containing all the titles.
		* @param description {String,Array} The description to be displayed with the picture, can also be an array containing all the descriptions.
		*/
		$.prettyPhoto.open = function(event) {
			if(typeof settings == "undefined"){ // Means it's an API call, need to manually get the settings and set the variables
				settings = pp_settings;
				pp_images = $.makeArray(arguments[0]);
				pp_titles = (arguments[1]) ? $.makeArray(arguments[1]) : $.makeArray("");
				pp_descriptions = (arguments[2]) ? $.makeArray(arguments[2]) : $.makeArray("");
				isSet = (pp_images.length > 1) ? true : false;
				set_position = (arguments[3])? arguments[3]: 0;
				_build_overlay(event.target); // Build the overlay {this} being the caller
			}
			
			if(settings.hideflash) $('object,embed,iframe[src*=youtube],iframe[src*=vimeo]').css('visibility','hidden'); // Hide the flash

			_checkPosition($(pp_images).size()); // Hide the next/previous links if on first or last images.
		
			$('.pp_loaderIcon').show();
		
			if(settings.deeplinking)
				setHashtag();
		
			// Rebuild Facebook Like Button with updated href
			if(settings.social_tools){
				facebook_like_link = settings.social_tools.replace('{location_href}', encodeURIComponent(location.href)); 
				$pp_pic_holder.find('.pp_social').html(facebook_like_link);
			}
			
			// Fade the content in
			if($ppt.is(':hidden')) $ppt.css('opacity',0).show();
			$pp_overlay.show().fadeTo(settings.animation_speed,settings.opacity);

			// Display the current position
			$pp_pic_holder.find('.currentTextHolder').text((set_position+1) + settings.counter_separator_label + $(pp_images).size());

			// Set the description
			if(typeof pp_descriptions[set_position] != 'undefined' && pp_descriptions[set_position] != ""){
				$pp_pic_holder.find('.pp_description').show().html(unescape(pp_descriptions[set_position]));
			}else{
				$pp_pic_holder.find('.pp_description').hide();
			}
			
			// Get the dimensions
			movie_width = ( parseFloat(getParam('width',pp_images[set_position])) ) ? getParam('width',pp_images[set_position]) : settings.default_width.toString();
			movie_height = ( parseFloat(getParam('height',pp_images[set_position])) ) ? getParam('height',pp_images[set_position]) : settings.default_height.toString();
			
			// If the size is % based, calculate according to window dimensions
			percentBased=false;
			if(movie_height.indexOf('%') != -1) { movie_height = parseFloat(($(window).height() * parseFloat(movie_height) / 100) - 150); percentBased = true; }
			if(movie_width.indexOf('%') != -1) { movie_width = parseFloat(($(window).width() * parseFloat(movie_width) / 100) - 150); percentBased = true; }
			
			// Fade the holder
			$pp_pic_holder.fadeIn(function(){
				// Set the title
				(settings.show_title && pp_titles[set_position] != "" && typeof pp_titles[set_position] != "undefined") ? $ppt.html(unescape(pp_titles[set_position])) : $ppt.html('&nbsp;');
				
				imgPreloader = "";
				skipInjection = false;
				
				// Inject the proper content
				switch(_getFileType(pp_images[set_position])){
					case 'image':
						imgPreloader = new Image();

						// Preload the neighbour images
						nextImage = new Image();
						if(isSet && set_position < $(pp_images).size() -1) nextImage.src = pp_images[set_position + 1];
						prevImage = new Image();
						if(isSet && pp_images[set_position - 1]) prevImage.src = pp_images[set_position - 1];

						$pp_pic_holder.find('#pp_full_res')[0].innerHTML = settings.image_markup.replace(/{path}/g,pp_images[set_position]);

						imgPreloader.onload = function(){
							// Fit item to viewport
							pp_dimensions = _fitToViewport(imgPreloader.width,imgPreloader.height);

							_showContent();
						};

						imgPreloader.onerror = function(){
							alert('Image cannot be loaded. Make sure the path is correct and image exist.');
							$.prettyPhoto.close();
						};
					
						imgPreloader.src = pp_images[set_position];
					break;
				
					case 'youtube':
						pp_dimensions = _fitToViewport(movie_width,movie_height); // Fit item to viewport
						
						// Regular youtube link
						movie_id = getParam('v',pp_images[set_position]);
						
						// youtu.be link
						if(movie_id == ""){
							movie_id = pp_images[set_position].split('youtu.be/');
							movie_id = movie_id[1];
							if(movie_id.indexOf('?') > 0)
								movie_id = movie_id.substr(0,movie_id.indexOf('?')); // Strip anything after the ?

							if(movie_id.indexOf('&') > 0)
								movie_id = movie_id.substr(0,movie_id.indexOf('&')); // Strip anything after the &
						}

						movie = 'http://www.youtube.com/embed/'+movie_id;
						(getParam('rel',pp_images[set_position])) ? movie+="?rel="+getParam('rel',pp_images[set_position]) : movie+="?rel=1";
							
						if(settings.autoplay) movie += "&autoplay=1";
					
						toInject = settings.iframe_markup.replace(/{width}/g,pp_dimensions['width']).replace(/{height}/g,pp_dimensions['height']).replace(/{wmode}/g,settings.wmode).replace(/{path}/g,movie);
					break;
				
					case 'vimeo':
						pp_dimensions = _fitToViewport(movie_width,movie_height); // Fit item to viewport
					
						movie_id = pp_images[set_position];
						var regExp = /http(s?):\/\/(www\.)?vimeo.com\/(\d+)/;
						var match = movie_id.match(regExp);
						
						movie = 'http://player.vimeo.com/video/'+ match[3] +'?title=0&amp;byline=0&amp;portrait=0';
						if(settings.autoplay) movie += "&autoplay=1;";
				
						vimeo_width = pp_dimensions['width'] + '/embed/?moog_width='+ pp_dimensions['width'];
				
						toInject = settings.iframe_markup.replace(/{width}/g,vimeo_width).replace(/{height}/g,pp_dimensions['height']).replace(/{path}/g,movie);
					break;
				
					case 'quicktime':
						pp_dimensions = _fitToViewport(movie_width,movie_height); // Fit item to viewport
						pp_dimensions['height']+=15; pp_dimensions['contentHeight']+=15; pp_dimensions['containerHeight']+=15; // Add space for the control bar
				
						toInject = settings.quicktime_markup.replace(/{width}/g,pp_dimensions['width']).replace(/{height}/g,pp_dimensions['height']).replace(/{wmode}/g,settings.wmode).replace(/{path}/g,pp_images[set_position]).replace(/{autoplay}/g,settings.autoplay);
					break;
				
					case 'flash':
						pp_dimensions = _fitToViewport(movie_width,movie_height); // Fit item to viewport
					
						flash_vars = pp_images[set_position];
						flash_vars = flash_vars.substring(pp_images[set_position].indexOf('flashvars') + 10,pp_images[set_position].length);

						filename = pp_images[set_position];
						filename = filename.substring(0,filename.indexOf('?'));
					
						toInject =  settings.flash_markup.replace(/{width}/g,pp_dimensions['width']).replace(/{height}/g,pp_dimensions['height']).replace(/{wmode}/g,settings.wmode).replace(/{path}/g,filename+'?'+flash_vars);
					break;
				
					case 'iframe':
						pp_dimensions = _fitToViewport(movie_width,movie_height); // Fit item to viewport
				
						frame_url = pp_images[set_position];
						frame_url = frame_url.substr(0,frame_url.indexOf('iframe')-1);

						toInject = settings.iframe_markup.replace(/{width}/g,pp_dimensions['width']).replace(/{height}/g,pp_dimensions['height']).replace(/{path}/g,frame_url);
					break;
					
					case 'ajax':
						doresize = false; // Make sure the dimensions are not resized.
						pp_dimensions = _fitToViewport(movie_width,movie_height);
						doresize = true; // Reset the dimensions
					
						skipInjection = true;
						$.get(pp_images[set_position],function(responseHTML){
							toInject = settings.inline_markup.replace(/{content}/g,responseHTML);
							$pp_pic_holder.find('#pp_full_res')[0].innerHTML = toInject;
							_showContent();
						});
						
					break;
					
					case 'custom':
						pp_dimensions = _fitToViewport(movie_width,movie_height); // Fit item to viewport
					
						toInject = settings.custom_markup;
					break;
				
					case 'inline':
						// to get the item height clone it, apply default width, wrap it in the prettyPhoto containers , then delete
						myClone = $(pp_images[set_position]).clone().append('<br clear="all" />').css({'width':settings.default_width}).wrapInner('<div id="pp_full_res"><div class="pp_inline"></div></div>').appendTo($('body')).show();
						doresize = false; // Make sure the dimensions are not resized.
						pp_dimensions = _fitToViewport($(myClone).width(),$(myClone).height());
						doresize = true; // Reset the dimensions
						$(myClone).remove();
						toInject = settings.inline_markup.replace(/{content}/g,$(pp_images[set_position]).html());
					break;
				};

				if(!imgPreloader && !skipInjection){
					$pp_pic_holder.find('#pp_full_res')[0].innerHTML = toInject;
				
					// Show content
					_showContent();
				};
			});

			return false;
		};

	
		/**
		* Change page in the prettyPhoto modal box
		* @param direction {String} Direction of the paging, previous or next.
		*/
		$.prettyPhoto.changePage = function(direction){
			currentGalleryPage = 0;
			
			if(direction == 'previous') {
				set_position--;
				if (set_position < 0) set_position = $(pp_images).size()-1;
			}else if(direction == 'next'){
				set_position++;
				if(set_position > $(pp_images).size()-1) set_position = 0;
			}else{
				set_position=direction;
			};
			
			rel_index = set_position;

			if(!doresize) doresize = true; // Allow the resizing of the images
			if(settings.allow_expand) {
				$('.pp_contract').removeClass('pp_contract').addClass('pp_expand');
			}

			_hideContent(function(){ $.prettyPhoto.open(); });
		};


		/**
		* Change gallery page in the prettyPhoto modal box
		* @param direction {String} Direction of the paging, previous or next.
		*/
		$.prettyPhoto.changeGalleryPage = function(direction){
			if(direction=='next'){
				currentGalleryPage ++;

				if(currentGalleryPage > totalPage) currentGalleryPage = 0;
			}else if(direction=='previous'){
				currentGalleryPage --;

				if(currentGalleryPage < 0) currentGalleryPage = totalPage;
			}else{
				currentGalleryPage = direction;
			};
			
			slide_speed = (direction == 'next' || direction == 'previous') ? settings.animation_speed : 0;

			slide_to = currentGalleryPage * (itemsPerPage * itemWidth);

			$pp_gallery.find('ul').animate({left:-slide_to},slide_speed);
		};


		/**
		* Start the slideshow...
		*/
		$.prettyPhoto.startSlideshow = function(){
			if(typeof pp_slideshow == 'undefined'){
				$pp_pic_holder.find('.pp_play').unbind('click').removeClass('pp_play').addClass('pp_pause').click(function(){
					$.prettyPhoto.stopSlideshow();
					return false;
				});
				pp_slideshow = setInterval($.prettyPhoto.startSlideshow,settings.slideshow);
			}else{
				$.prettyPhoto.changePage('next');	
			};
		}


		/**
		* Stop the slideshow...
		*/
		$.prettyPhoto.stopSlideshow = function(){
			$pp_pic_holder.find('.pp_pause').unbind('click').removeClass('pp_pause').addClass('pp_play').click(function(){
				$.prettyPhoto.startSlideshow();
				return false;
			});
			clearInterval(pp_slideshow);
			pp_slideshow=undefined;
		}


		/**
		* Closes prettyPhoto.
		*/
		$.prettyPhoto.close = function(){
			if($pp_overlay.is(":animated")) return;
			
			$.prettyPhoto.stopSlideshow();
			
			$pp_pic_holder.stop().find('object,embed').css('visibility','hidden');
			
			$('div.pp_pic_holder,div.ppt,.pp_fade').fadeOut(settings.animation_speed,function(){ $(this).remove(); });
			
			$pp_overlay.fadeOut(settings.animation_speed, function(){
				
				if(settings.hideflash) $('object,embed,iframe[src*=youtube],iframe[src*=vimeo]').css('visibility','visible'); // Show the flash
				
				$(this).remove(); // No more need for the prettyPhoto markup
				
				$(window).unbind('scroll.prettyphoto');
				
				clearHashtag();
				
				settings.callback();
				
				doresize = true;
				
				pp_open = false;
				
				delete settings;
			});
		};
	
		/**
		* Set the proper sizes on the containers and animate the content in.
		*/
		function _showContent(){
			$('.pp_loaderIcon').hide();

			// Calculate the opened top position of the pic holder
			projectedTop = scroll_pos['scrollTop'] + ((windowHeight/2) - (pp_dimensions['containerHeight']/2));
			if(projectedTop < 0) projectedTop = 0;

			$ppt.fadeTo(settings.animation_speed,1);

			// Resize the content holder
			$pp_pic_holder.find('.pp_content')
				.animate({
					height:pp_dimensions['contentHeight'],
					width:pp_dimensions['contentWidth']
				},settings.animation_speed);
			
			// Resize picture the holder
			$pp_pic_holder.animate({
				'top': projectedTop,
				'left': ((windowWidth/2) - (pp_dimensions['containerWidth']/2) < 0) ? 0 : (windowWidth/2) - (pp_dimensions['containerWidth']/2),
				width:pp_dimensions['containerWidth']
			},settings.animation_speed,function(){
				$pp_pic_holder.find('.pp_hoverContainer,#fullResImage').height(pp_dimensions['height']).width(pp_dimensions['width']);

				$pp_pic_holder.find('.pp_fade').fadeIn(settings.animation_speed); // Fade the new content

				// Show the nav
				if(isSet && _getFileType(pp_images[set_position])=="image") { $pp_pic_holder.find('.pp_hoverContainer').show(); }else{ $pp_pic_holder.find('.pp_hoverContainer').hide(); }
			
				if(settings.allow_expand) {
					if(pp_dimensions['resized']){ // Fade the resizing link if the image is resized
						$('a.pp_expand,a.pp_contract').show();
					}else{
						$('a.pp_expand').hide();
					}
				}
				
				if(settings.autoplay_slideshow && !pp_slideshow && !pp_open) $.prettyPhoto.startSlideshow();
				
				settings.changepicturecallback(); // Callback!
				
				pp_open = true;
			});
			
			_insert_gallery();
			pp_settings.ajaxcallback();
		};
		
		/**
		* Hide the content...DUH!
		*/
		function _hideContent(callback){
			// Fade out the current picture
			$pp_pic_holder.find('#pp_full_res object,#pp_full_res embed').css('visibility','hidden');
			$pp_pic_holder.find('.pp_fade').fadeOut(settings.animation_speed,function(){
				$('.pp_loaderIcon').show();
				
				callback();
			});
		};
	
		/**
		* Check the item position in the gallery array, hide or show the navigation links
		* @param setCount {integer} The total number of items in the set
		*/
		function _checkPosition(setCount){
			(setCount > 1) ? $('.pp_nav').show() : $('.pp_nav').hide(); // Hide the bottom nav if it's not a set.
		};
	
		/**
		* Resize the item dimensions if it's bigger than the viewport
		* @param width {integer} Width of the item to be opened
		* @param height {integer} Height of the item to be opened
		* @return An array containin the "fitted" dimensions
		*/
		function _fitToViewport(width,height){
			resized = false;

			_getDimensions(width,height);
			
			// Define them in case there's no resize needed
			imageWidth = width, imageHeight = height;

			if( ((pp_containerWidth > windowWidth) || (pp_containerHeight > windowHeight)) && doresize && settings.allow_resize && !percentBased) {
				resized = true, fitting = false;
			
				while (!fitting){
					if((pp_containerWidth > windowWidth)){
						imageWidth = (windowWidth - 200);
						imageHeight = (height/width) * imageWidth;
					}else if((pp_containerHeight > windowHeight)){
						imageHeight = (windowHeight - 200);
						imageWidth = (width/height) * imageHeight;
					}else{
						fitting = true;
					};

					pp_containerHeight = imageHeight, pp_containerWidth = imageWidth;
				};
			

				
				if((pp_containerWidth > windowWidth) || (pp_containerHeight > windowHeight)){
					_fitToViewport(pp_containerWidth,pp_containerHeight)
				};
				
				_getDimensions(imageWidth,imageHeight);
			};
			
			return {
				width:Math.floor(imageWidth),
				height:Math.floor(imageHeight),
				containerHeight:Math.floor(pp_containerHeight),
				containerWidth:Math.floor(pp_containerWidth) + (settings.horizontal_padding * 2),
				contentHeight:Math.floor(pp_contentHeight),
				contentWidth:Math.floor(pp_contentWidth),
				resized:resized
			};
		};
		
		/**
		* Get the containers dimensions according to the item size
		* @param width {integer} Width of the item to be opened
		* @param height {integer} Height of the item to be opened
		*/
		function _getDimensions(width,height){
			width = parseFloat(width);
			height = parseFloat(height);
			
			// Get the details height, to do so, I need to clone it since it's invisible
			$pp_details = $pp_pic_holder.find('.pp_details');
			$pp_details.width(width);
			detailsHeight = parseFloat($pp_details.css('marginTop')) + parseFloat($pp_details.css('marginBottom'));
			
			$pp_details = $pp_details.clone().addClass(settings.theme).width(width).appendTo($('body')).css({
				'position':'absolute',
				'top':-10000
			});
			detailsHeight += $pp_details.height();
			detailsHeight = (detailsHeight <= 34) ? 36 : detailsHeight; // Min-height for the details
			$pp_details.remove();
			
			// Get the titles height, to do so, I need to clone it since it's invisible
			$pp_title = $pp_pic_holder.find('.ppt');
			$pp_title.width(width);
			titleHeight = parseFloat($pp_title.css('marginTop')) + parseFloat($pp_title.css('marginBottom'));
			$pp_title = $pp_title.clone().appendTo($('body')).css({
				'position':'absolute',
				'top':-10000
			});
			titleHeight += $pp_title.height();
			$pp_title.remove();
			
			// Get the container size, to resize the holder to the right dimensions
			pp_contentHeight = height + detailsHeight;
			pp_contentWidth = width;
			pp_containerHeight = pp_contentHeight + titleHeight + $pp_pic_holder.find('.pp_top').height() + $pp_pic_holder.find('.pp_bottom').height();
			pp_containerWidth = width;
		}
	
		function _getFileType(itemSrc){
			if (itemSrc.match(/youtube\.com\/watch/i) || itemSrc.match(/youtu\.be/i)) {
				return 'youtube';
			}else if (itemSrc.match(/vimeo\.com/i)) {
				return 'vimeo';
			}else if(itemSrc.match(/\b.mov\b/i)){ 
				return 'quicktime';
			}else if(itemSrc.match(/\b.swf\b/i)){
				return 'flash';
			}else if(itemSrc.match(/\biframe=true\b/i)){
				return 'iframe';
			}else if(itemSrc.match(/\bajax=true\b/i)){
				return 'ajax';
			}else if(itemSrc.match(/\bcustom=true\b/i)){
				return 'custom';
			}else if(itemSrc.substr(0,1) == '#'){
				return 'inline';
			}else{
				return 'image';
			};
		};
	
		function _center_overlay(){
			if(doresize && typeof $pp_pic_holder != 'undefined') {
				scroll_pos = _get_scroll();
				contentHeight = $pp_pic_holder.height(), contentwidth = $pp_pic_holder.width();

				projectedTop = (windowHeight/2) + scroll_pos['scrollTop'] - (contentHeight/2);
				if(projectedTop < 0) projectedTop = 0;
				
				if(contentHeight > windowHeight)
					return;

				$pp_pic_holder.css({
					'top': projectedTop,
					'left': (windowWidth/2) + scroll_pos['scrollLeft'] - (contentwidth/2)
				});
			};
		};
	
		function _get_scroll(){
			if (self.pageYOffset) {
				return {scrollTop:self.pageYOffset,scrollLeft:self.pageXOffset};
			} else if (document.documentElement && document.documentElement.scrollTop) { // Explorer 6 Strict
				return {scrollTop:document.documentElement.scrollTop,scrollLeft:document.documentElement.scrollLeft};
			} else if (document.body) {// all other Explorers
				return {scrollTop:document.body.scrollTop,scrollLeft:document.body.scrollLeft};
			};
		};
	
		function _resize_overlay() {
			windowHeight = $(window).height(), windowWidth = $(window).width();
			
			if(typeof $pp_overlay != "undefined") $pp_overlay.height($(document).height()).width(windowWidth);
		};
	
		function _insert_gallery(){
			if(isSet && settings.overlay_gallery && _getFileType(pp_images[set_position])=="image") {
				itemWidth = 52+5; // 52 beign the thumb width, 5 being the right margin.
				navWidth = (settings.theme == "facebook" || settings.theme == "pp_default") ? 50 : 30; // Define the arrow width depending on the theme
				
				itemsPerPage = Math.floor((pp_dimensions['containerWidth'] - 100 - navWidth) / itemWidth);
				itemsPerPage = (itemsPerPage < pp_images.length) ? itemsPerPage : pp_images.length;
				totalPage = Math.ceil(pp_images.length / itemsPerPage) - 1;

				// Hide the nav in the case there's no need for links
				if(totalPage == 0){
					navWidth = 0; // No nav means no width!
					$pp_gallery.find('.pp_arrow_next,.pp_arrow_previous').hide();
				}else{
					$pp_gallery.find('.pp_arrow_next,.pp_arrow_previous').show();
				};

				galleryWidth = itemsPerPage * itemWidth;
				fullGalleryWidth = pp_images.length * itemWidth;
				
				// Set the proper width to the gallery items
				$pp_gallery
					.css('margin-left',-((galleryWidth/2) + (navWidth/2)))
					.find('div:first').width(galleryWidth+5)
					.find('ul').width(fullGalleryWidth)
					.find('li.selected').removeClass('selected');
				
				goToPage = (Math.floor(set_position/itemsPerPage) < totalPage) ? Math.floor(set_position/itemsPerPage) : totalPage;

				$.prettyPhoto.changeGalleryPage(goToPage);
				
				$pp_gallery_li.filter(':eq('+set_position+')').addClass('selected');
			}else{
				$pp_pic_holder.find('.pp_content').unbind('mouseenter mouseleave');
				// $pp_gallery.hide();
			}
		}
	
		function _build_overlay(caller){
			// Inject Social Tool markup into General markup
			if(settings.social_tools)
				facebook_like_link = settings.social_tools.replace('{location_href}', encodeURIComponent(location.href)); 

			settings.markup = settings.markup.replace('{pp_social}',''); 
			
			$('body').append(settings.markup); // Inject the markup
			
			$pp_pic_holder = $('.pp_pic_holder') , $ppt = $('.ppt'), $pp_overlay = $('div.pp_overlay'); // Set my global selectors
			
			// Inject the inline gallery!
			if(isSet && settings.overlay_gallery) {
				currentGalleryPage = 0;
				toInject = "";
				for (var i=0; i < pp_images.length; i++) {
					if(!pp_images[i].match(/\b(jpg|jpeg|png|gif)\b/gi)){
						classname = 'default';
						img_src = '';
					}else{
						classname = '';
						img_src = pp_images[i];
					}
					toInject += "<li class='"+classname+"'><a href='#'><img src='" + img_src + "' width='50' alt='' /></a></li>";
				};
				
				toInject = settings.gallery_markup.replace(/{gallery}/g,toInject);
				
				$pp_pic_holder.find('#pp_full_res').after(toInject);
				
				$pp_gallery = $('.pp_pic_holder .pp_gallery'), $pp_gallery_li = $pp_gallery.find('li'); // Set the gallery selectors
				
				$pp_gallery.find('.pp_arrow_next').click(function(){
					$.prettyPhoto.changeGalleryPage('next');
					$.prettyPhoto.stopSlideshow();
					return false;
				});
				
				$pp_gallery.find('.pp_arrow_previous').click(function(){
					$.prettyPhoto.changeGalleryPage('previous');
					$.prettyPhoto.stopSlideshow();
					return false;
				});
				
				$pp_pic_holder.find('.pp_content').hover(
					function(){
						$pp_pic_holder.find('.pp_gallery:not(.disabled)').fadeIn();
					},
					function(){
						$pp_pic_holder.find('.pp_gallery:not(.disabled)').fadeOut();
					});

				itemWidth = 52+5; // 52 beign the thumb width, 5 being the right margin.
				$pp_gallery_li.each(function(i){
					$(this)
						.find('a')
						.click(function(){
							$.prettyPhoto.changePage(i);
							$.prettyPhoto.stopSlideshow();
							return false;
						});
				});
			};
			
			
			// Inject the play/pause if it's a slideshow
			if(settings.slideshow){
				$pp_pic_holder.find('.pp_nav').prepend('<a href="#" class="pp_play">Play</a>')
				$pp_pic_holder.find('.pp_nav .pp_play').click(function(){
					$.prettyPhoto.startSlideshow();
					return false;
				});
			}
			
			$pp_pic_holder.attr('class','pp_pic_holder ' + settings.theme); // Set the proper theme
			
			$pp_overlay
				.css({
					'opacity':0,
					'height':$(document).height(),
					'width':$(window).width()
					})
				.bind('click',function(){
					if(!settings.modal) $.prettyPhoto.close();
				});

			$('a.pp_close').bind('click',function(){ $.prettyPhoto.close(); return false; });


			if(settings.allow_expand) {
				$('a.pp_expand').bind('click',function(e){
					// Expand the image
					if($(this).hasClass('pp_expand')){
						$(this).removeClass('pp_expand').addClass('pp_contract');
						doresize = false;
					}else{
						$(this).removeClass('pp_contract').addClass('pp_expand');
						doresize = true;
					};
				
					_hideContent(function(){ $.prettyPhoto.open(); });
			
					return false;
				});
			}
		
			$pp_pic_holder.find('.pp_previous, .pp_nav .pp_arrow_previous').bind('click',function(){
				$.prettyPhoto.changePage('previous');
				$.prettyPhoto.stopSlideshow();
				return false;
			});
		
			$pp_pic_holder.find('.pp_next, .pp_nav .pp_arrow_next').bind('click',function(){
				$.prettyPhoto.changePage('next');
				$.prettyPhoto.stopSlideshow();
				return false;
			});
			
			_center_overlay(); // Center it
		};

		if(!pp_alreadyInitialized && getHashtag()){
			pp_alreadyInitialized = true;
			
			// Grab the rel index to trigger the click on the correct element
			hashIndex = getHashtag();
			hashRel = hashIndex;
			hashIndex = hashIndex.substring(hashIndex.indexOf('/')+1,hashIndex.length-1);
			hashRel = hashRel.substring(0,hashRel.indexOf('/'));

			// Little timeout to make sure all the prettyPhoto initialize scripts has been run.
			// Useful in the event the page contain several init scripts.
			setTimeout(function(){ $("a["+pp_settings.hook+"^='"+hashRel+"']:eq("+hashIndex+")").trigger('click'); },50);
		}
		
		return this.unbind('click.prettyphoto').bind('click.prettyphoto',$.prettyPhoto.initialize); // Return the jQuery object for chaining. The unbind method is used to avoid click conflict when the plugin is called more than once
	};
	
	function getHashtag(){
		var url = location.href;
		hashtag = (url.indexOf('#prettyPhoto') !== -1) ? decodeURI(url.substring(url.indexOf('#prettyPhoto')+1,url.length)) : false;

		return hashtag;
	};
	
	function setHashtag(){
		if(typeof theRel == 'undefined') return; // theRel is set on normal calls, it's impossible to deeplink using the API
		location.hash = theRel + '/'+rel_index+'/';
	};
	
	function clearHashtag(){
		if ( location.href.indexOf('#prettyPhoto') !== -1 ) location.hash = "prettyPhoto";
	}
	
	function getParam(name,url){
	  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	  var regexS = "[\\?&]"+name+"=([^&#]*)";
	  var regex = new RegExp( regexS );
	  var results = regex.exec( url );
	  return ( results == null ) ? "" : results[1];
	}
	
})(jQuery);

var pp_alreadyInitialized = false; // Used for the deep linking to make sure not to call the same function several times.
;

(function ($) {

Drupal.Sweaver = Drupal.Sweaver || {};
Drupal.Sweaver.invokes = Drupal.Sweaver.invokes || {};

Drupal.Sweaver.messageTimer = null;
Drupal.Sweaver.changed = false;
Drupal.Sweaver.popup = '';

Drupal.Sweaver.writeCss = function(context) {

  var fullCss = '';
  $.each(Drupal.Sweaver.invokes, function(func) {
    var css = this.execute();
    if (css != '') {
      fullCss += css;
    }
  });
  $style = $('head style[title="sweaver"]');
  $style.remove();
  $('head').append('<style type="text/css" title="sweaver">' + fullCss + '</style>');
  $('[name=css-rendered]').val(fullCss);

  Drupal.Sweaver.changed = true;
};

$(document).ready(function() {

  // Avoid overlap with the localization client.
  if ($('#l10n-client').length > 0) {
    $('#sweaver').css({'bottom': $('#l10n-client .labels').height()});
  }

  // Gather open/close state and tab information
  Drupal.Sweaver.activeTab = Drupal.Sweaver.cookie('sweaver_active_tab') ? Drupal.Sweaver.cookie('sweaver_active_tab') : $('#sweaver-tabs .tab:first').attr('id');
  $('#' + Drupal.Sweaver.activeTab).addClass('active-tab');
  Drupal.Sweaver.cookie('sweaver_active_tab', Drupal.Sweaver.activeTab);
  Drupal.Sweaver.open = Drupal.Sweaver.cookie('sweaver_open') ? Drupal.Sweaver.cookie('sweaver_open') : 'true';
  Drupal.Sweaver.cookie('sweaver_open', Drupal.Sweaver.open);

  // Add sweaver class for extra margin at bottom.
  if (Drupal.Sweaver.open != 'false') {
    $('body').addClass('sweaver');
  }
  
  // Open/close the Sweaver bar.
  $('#sweaver-tabs .close a').click(function(){
    Drupal.Sweaver.toggleBar($(this).parent());
  });

  // Toggle the horizontal tabs.
  Drupal.Sweaver.container = Drupal.Sweaver.activeTab.substr(4, Drupal.Sweaver.activeTab.length - 4);
  $('#sweaver-tabs .tab a').click(function(){
    Drupal.Sweaver.toggleTabs($(this).parent());
  });

  // Print messages if any
  if ($('[name=sweaver-editor-messages]').val() != '') {
    Drupal.Sweaver.setMessage($('[name=sweaver-editor-messages]').val(), 5000);
  }

  // toggle vertical tabs
  $('#sweaver .vertical-tabs a').click(function(){
    if (!$(this).hasClass('active')) {
      // handle active classes.
      $('#sweaver #' + Drupal.Sweaver.container + ' .vertical-tabs .active').removeClass('active');
      $(this).addClass('active');
      var id = $(this).parent().attr('id').replace('tab-', '');
      $('#sweaver #' + Drupal.Sweaver.container + ' .vertical-content #container-' + id).siblings().hide();
      $('#sweaver #' + Drupal.Sweaver.container + ' .vertical-content #container-' + id).show();
    }
    return false;
  });

});

/**
 * Separate toggle bar function.
 */
Drupal.Sweaver.toggleBar = function (tab) {
  if (Drupal.Sweaver.open == 'false') {
    $('#sweaver-middle').css('height', 'auto');
    tab.removeClass('active-tab');
    $('#sweaver-tabs .close').removeClass('active-tab');
    $('#' + Drupal.Sweaver.activeTab).addClass('active-tab');
    Drupal.Sweaver.open = 'true';
  }
  else {
    $('#sweaver-middle').css("height", 0);
    $('#follow-link').hide();
    Drupal.Sweaver.activeTab =  $('#sweaver-tabs .active-tab').attr('id');
    tab.addClass('active-tab');
    $('#sweaver-tabs .close').addClass('active-tab');
    Drupal.Sweaver.open = 'false';
  }
  // Hide the extra margin at the bottom of the screen.
  $('body').toggleClass('sweaver');

  Drupal.Sweaver.toggleClicked();
  Drupal.Sweaver.cookie('sweaver_open', Drupal.Sweaver.open);
}

/**
 * Separate toggle tabs function.
 */
Drupal.Sweaver.toggleTabs = function (tab) {
  // Get the container that has to be shown.
  var container = tab.attr('id').replace('tab-', '');
  if (container != Drupal.Sweaver.container) {
    //Drupal.Sweaver.toggleBar(tab);
    if (Drupal.Sweaver.open == 'false') {
      $('#sweaver-middle').css("height", 'auto');
      Drupal.Sweaver.open = 'true';
      $('body').addClass('sweaver');
    }
    tab.siblings().removeClass('active-tab');
    tab.toggleClass('active-tab');
    $('#'+ container + ' > div').show();
    $('#'+ Drupal.Sweaver.container + ' > div').hide();
    Drupal.Sweaver.container = container;
  }
  else {
    Drupal.Sweaver.toggleBar(tab);
  }
  Drupal.Sweaver.activeTab =  tab.attr('id');
  Drupal.Sweaver.cookie('sweaver_open', Drupal.Sweaver.open);
  Drupal.Sweaver.cookie('sweaver_active_tab', Drupal.Sweaver.activeTab);
  Drupal.Sweaver.hidePopup();
  Drupal.Sweaver.toggleClicked();
};

/**
 * Separate switch tab function. Takes the tab as arguments and the ID's
 * of the containers will be derived from the tabs.
 */
Drupal.Sweaver.toggleClicked = function () {
  if (Drupal.Sweaver.open == 'true' && Drupal.Sweaver.activeTab == 'tab-sweaver_plugin_editor') {
    // Show the outline on all 'clicked' classes.
    $('.sweaver-clicked-temp').removeClass('sweaver-clicked-temp').addClass('sweaver-clicked');
  }
  else {
    // Hide the outline on all 'clicked' elements
    $('.sweaver-clicked').removeClass('sweaver-clicked').addClass('sweaver-clicked-temp');
  }
}

/**
 * Separate switch tab function. Takes the tab as arguments and the ID's
 * of the containers will be derived from the tabs.
 */
Drupal.Sweaver.switchTab = function (remove_tab, show_tab) {
  var container_remove = remove_tab.replace('tab-', '');
  var container_show = show_tab.replace('tab-', '');

  $('#'+ remove_tab).removeClass('active-tab');
  $('#'+ show_tab).toggleClass('active-tab');
  $('#'+ container_remove + ' > div').hide();
  $('#'+ container_show + ' > div').show();
  Drupal.Sweaver.container = container_show;

  Drupal.Sweaver.activeTab = show_tab;
  Drupal.Sweaver.cookie('sweaver_active_tab', show_tab);
  Drupal.Sweaver.hidePopup();
}

/**
 * Display Sweaver messages.
 */
Drupal.Sweaver.setMessage = function(message, timeout) {
  Drupal.Sweaver.setMessagePosition();
  $('#sweaver-messages .message').html(message);
  $('#sweaver-messages').fadeIn('fast');
  Drupal.Sweaver.messageTimer = window.setTimeout(function() {$('#sweaver-messages').fadeOut('normal');}, timeout);

  // Bind close messages.
  $('#sweaver-messages .close').click(function(){
    $('#sweaver-messages').hide();
    clearTimeout(Drupal.Sweaver.messageTimer);
  });

  // Bind resize on window.
  $(window).resize(function(event){
    Drupal.Sweaver.setMessagePosition();
  });
}

/**
 * Set the position of the message.
 */
Drupal.Sweaver.setMessagePosition = function(){
  messageTop = $(window).height() - $('#sweaver').outerHeight() - $('#sweaver-messages').outerHeight() - 7;
  $('#sweaver-messages').css({'top' : messageTop});
}

/**
 * Display a fullscreen popup.
 */
Drupal.Sweaver.showPopup = function(message, width, height) {
  // Close the previous popup - if any.
  if (Drupal.Sweaver.popup != '') {
    $(Drupal.Sweaver.popup).hide();
  }

  // Create popup.
  popup = $('#sweaver-popup');
  $(message).show();
  Drupal.Sweaver.popup = message;
  Drupal.Sweaver.setPopupSize(popup, width, height);
  popup.fadeIn('fast');

  // Bind close button action.
  $('.close', popup).click(function(){
    $(message).hide();
    Drupal.Sweaver.hidePopup();
  });

  // Bind resize on window if no width or height was given
  // and the popup is full screen.
  if (!width && !height) {
    $(window).bind('resize.Drupal.Sweaver', function(event){
      Drupal.Sweaver.setPopupSize(popup);
    });
  }
}

/**
 * Set the popup width and height.
 */
Drupal.Sweaver.setPopupSize = function(popup, width, height) {
  popupBorder = 7;
  // Reset overflow in case we don't need a scrollbar.
  $('.content', popup).css({'overflow-y' : 'hidden'});

  // Calculate width and height.
  var popupWidth = width ? width : $(window).width() - (popupBorder * 2) - parseInt(popup.css('padding-left')) - parseInt(popup.css('padding-right'));
  var popupHeight = height ? height : $(window).height() - $('#sweaver').outerHeight() - (popupBorder * 2) - parseInt(popup.css('padding-top')) - parseInt(popup.css('padding-bottom'));
  $('.content', popup).css({'height' : popupHeight, 'width' : popupWidth});

  // Center the popup in case a width or height was given.
  var popupLeft = width ? (($(window).width() - parseInt(popupWidth)) / 2) : popupBorder;
  var popupTop = height ? (($(window).height() - parseInt(popupHeight)) / 2) : popupBorder;
  popup.css({'left' : popupLeft + 'px', 'top' : popupTop + 'px'});

  // Add scrollbar if in fullscreen mode.
  if (!height) {
    $('.content', popup).css({'overflow-y' : 'scroll'});
  }
}

/**
 * Hide a popup.
 */
Drupal.Sweaver.hidePopup = function() {
  $('#sweaver-popup').hide();
  $(window).unbind('resize.Drupal.Sweaver');
}

/**
 * Set behaviors on link which will open the popup.
 */
Drupal.behaviors.sweaverOpenPopup = {
  attach: function (context) {
  $('#sweaver .popup-link a').click(function() {
      var wrapper = $(this).attr('id').replace('link', 'data');

      popup = $('#sweaver-popup');
      if (popup.is(':visible') && $(this).hasClass('open-tab')) {
        Drupal.Sweaver.hidePopup();
        $(this).removeClass('open-tab');
      }
      else {
        $('#sweaver .open-style-actions').removeClass('open-style-actions');
        $('#sweaver .open-tab').removeClass('open-tab');
        $(this).addClass('open-tab');
        Drupal.Sweaver.showPopup($('#'+ wrapper));
      }
      return false;
    });

    $('#sweaver .form-submit').click(function() {
      Drupal.Sweaver.hidePopup();
    });

    // Open a popup when clicking on an open/save/delete/publish link.
    $('#sweaver .style-actions-link a').click(function() {
      var wrapper = $(this).attr('id').replace('link', 'data');

      popup = $('#sweaver-popup');
      if (popup.is(':visible') && $(this).hasClass('open-style-actions')) {
        Drupal.Sweaver.hidePopup();
        $(this).removeClass('open-style-actions');
      }
      else {
        $('#sweaver .open-style-actions').removeClass('open-style-actions');
        $('#sweaver .open-tab').removeClass('open-tab');
        $(this).addClass('open-style-actions');
        Drupal.Sweaver.hidePopup();
        Drupal.Sweaver.showPopup($('#'+ wrapper), '400px', '200px');
      }
      return false;
    });
  }
};


/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

/**
 * Create a cookie with the given name and value and other optional parameters.
 *
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Set the value of a cookie.
 * @example $.cookie('the_cookie', 'the_value', { expires: 7, path: '/', domain: 'jquery.com', secure: true });
 * @desc Create a cookie with all available options.
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Create a session cookie.
 * @example $.cookie('the_cookie', null);
 * @desc Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
 *       used when the cookie was set.
 *
 * @param String name The name of the cookie.
 * @param String value The value of the cookie.
 * @param Object options An object literal containing key/value pairs to provide optional cookie attributes.
 * @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
 *                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
 *                             If set to null or omitted, the cookie will be a session cookie and will not be retained
 *                             when the the browser exits.
 * @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
 * @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
 * @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
 *                        require a secure protocol (like HTTPS).
 * @type undefined
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */

/**
 * Get the value of a cookie with the given name.
 *
 * @example $.cookie('the_cookie');
 * @desc Get the value of a cookie.
 *
 * @param String name The name of the cookie.
 * @return The value of the cookie.
 * @type String
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */
Drupal.Sweaver.cookie = function(name, value, options) {
  if (typeof value != 'undefined') { // name and value given, set cookie
    options = options || {};
    if (value === null) {
      value = '';
      options.expires = -1;
    }
    var expires = '';
    if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
      var date;
      if (typeof options.expires == 'number') {
        date = new Date();
        date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
      }
      else {
        date = options.expires;
      }
      expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
    }
    // CAUTION: Needed to parenthesize options.path and options.domain
    // in the following expressions, otherwise they evaluate to undefined
    // in the packed version for some reason...
    var path = options.path ? '; path=' + (options.path) : '; path=/';
    var domain = options.domain ? '; domain=' + (options.domain) : '';
    var secure = options.secure ? '; secure' : '';
    document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
  }
  else { // only name given, get cookie
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
};

})(jQuery);;
// $Id: sweaver_plugin_editor.js,v 1.1.2.21.2.20 2010/11/08 16:01:24 jyve Exp $

/**
 * Add the sweaver bar at the bottom of the theme
 */

(function ($) {

Drupal.Sweaver = Drupal.Sweaver || {};

Drupal.Sweaver.types = new Array(); // A type groups different properties.
Drupal.Sweaver.properties = new Array(); // The actual css properties.
Drupal.Sweaver.selectors = new Array(); // The list of defined selector objects.
Drupal.Sweaver.css = new Object(); // Object with all targets and their properties.
Drupal.Sweaver.path = new Array(); // Full path to the root of the document.
Drupal.Sweaver.pathIndexes = new Array(); // An array with the indexes of all selected items.
Drupal.Sweaver.activePath = ''; // Currently active path including pseudo-classes.
Drupal.Sweaver.safeActivePath = ''; // Currently active path excluding pseudo-classes.
Drupal.Sweaver.activeElement = new Object(); // Currently active element.
Drupal.Sweaver.updateMode = true; // should the form updates be saved in css?

/**
 * Hook onload behavior
 */
$(document).ready(function() {

  Drupal.Sweaver.init();

  Drupal.Sweaver.writeCss();

  Drupal.Sweaver.changed = false;

  Drupal.Sweaver.addSliders();

  Drupal.Sweaver.addColorPicker();

  Drupal.Sweaver.updateForm();

  Drupal.Sweaver.bindClicks();
  
  Drupal.Sweaver.LoadPosition();
});

/**
 * Implements Drupal.Sweaver.invokes.processCSS().
 */
Drupal.Sweaver.invokes.editor = {
  execute: function (context, settings) {
    var css = '';
    var fullCss = '';
    var cssContent = '';

    for (var key in Drupal.Sweaver.css) {
      var target = Drupal.Sweaver.css[key];
      var contains_hidden_property = false;
      for (var prop in target) {
        if (Drupal.Sweaver.properties[prop]) {

          var properties = Drupal.Sweaver.properties[prop]['property'].split(' ');
          $.each(properties, function(i, property) {
            // Don't write anything if the value is empty.
            // 0 is not empty!
            if (target[prop]['value'] == '' && target[prop]['value'] != '0') {
              cssContent += '';
            }
            // Don't right anything if the property is hidden
            else if (target[prop]['hidden']) {
              cssContent += '';
              contains_hidden_property = true;
            }
            // Don't add a prefix and suffix for these exceptions.
            else if ((property == 'background-color' && target[prop]['value'] == 'transparent') || (property == 'background-image' && target[prop]['value'] == 'none')) {
              cssContent += '  ' + property + ': ' + target[prop]['value'] + ';\n';
            }
            else {
              cssContent += '  ' + property + ': ' + Drupal.Sweaver.properties[prop].prefix + target[prop]['value'] + Drupal.Sweaver.properties[prop].suffix + ';\n';
            }
          });
        }
      }

      if (cssContent != '' || contains_hidden_property) {
        css += key + '{\n';
        css += cssContent;
        css += '}\n';
        fullCss += css;
        css = '';
        cssContent = '';
      }
      // Remove key from Drupal.Sweaver.css
      else {
        delete Drupal.Sweaver.css[key];
      }
    }

    // Store css in hidden field in save form
    $("#sweaver [name=sweaver-css]").val($.toJSON(Drupal.Sweaver.css));

    // Add inline css
    $("#sweaver-form [name=sweaver-css]").val(fullCss);

    return fullCss;
  }
};

/**
 * Initialize member variables and properties.
 */
Drupal.Sweaver.init = function() {

  // Get previously stored information or create empty object with all targets
  db_css = $("[name=sweaver-css]");
  if (db_css.val() && db_css.val() != '[]'){
    Drupal.Sweaver.css = $.evalJSON(db_css.val());
    
    // Check if values are correctly set
    // If not they are converted in aim to correct depreciated behaviour
    for (key in Drupal.Sweaver.css){
      var target = Drupal.Sweaver.css[key];
      for (prop in target) {
        if (jQuery.type(target[prop]) != 'object'){
          Drupal.Sweaver.css[key][prop] = {
            'value' : Drupal.Sweaver.css[key][prop],
            'hidden' : false,
          };
        }  
      }
    }
    db_css.val('');
  }

  // Get Sweaver selectors.
  Drupal.Sweaver.selectors = Drupal.settings.sweaver['selectors'];

  // Get Sweaver types.
  Drupal.Sweaver.types = Drupal.settings.sweaver['types'];

  // Get Sweaver properties.
  Drupal.Sweaver.properties = Drupal.settings.sweaver['properties'];

  // Get classes that will never be used in the paths or generated css.
  Drupal.Sweaver.excludeClasses = Drupal.settings.sweaver['exclude_classes'];

  // Add a link popup to be able to follow links.
  $('body').append('<a href="#" id="follow-link">' + Drupal.t('Click here to follow this link') + '</a>');
}

/**
 * Get all css values and update the form
 */
Drupal.Sweaver.updateForm = function() {

  // Empty form values and hide unnecessary fields
  Drupal.Sweaver.initForm();

  // Prevent changes from being saved
  Drupal.Sweaver.updateMode = false;

  // Update form with saved settings
  if (Drupal.Sweaver.activePath != '') {
    if ($("#tab-sweaver_plugin_editor").hasClass('active-tab')) {
      $("#sweaver_plugin_editor #sweaver-editor").show();
    }
    var target = '';
    if (!isEmpty(Drupal.Sweaver.activeElement)) {
      var type = Drupal.Sweaver.activeElement.type;
      if (Drupal.Sweaver.types[type]) {
        $.each(Drupal.Sweaver.types[type], function (index, object){
          if (Drupal.Sweaver.properties[object]){
	          var properties = Drupal.Sweaver.properties[object]['property'].split(' ');
	          var tempValue = '';
	          var value = '';
	          $.each(properties, function(i, property) {
	            // Are there pseudo-classes in the active path? If so check the saved css for any values that have been set.
	            // We have do this since jQuery cannot get any values for selectors with pseudo-classes.
	            if (Drupal.Sweaver.safeActivePath != Drupal.Sweaver.activePath && Drupal.Sweaver.css[Drupal.Sweaver.activePath] && Drupal.Sweaver.css[Drupal.Sweaver.activePath][property]['value']) {
                value = Drupal.Sweaver.properties[property].prefix + Drupal.Sweaver.css[Drupal.Sweaver.activePath][property]['value'] + Drupal.Sweaver.properties[property].suffix;
              }
              else {
                value = $(Drupal.Sweaver.safeActivePath).css(property);
              }
	            if (tempValue == '') {
	              tempValue = value;
	            }
	            else {
	              if (tempValue != value) {
	                value = '';
	                return false;
	              }
	            }
	          });
	          if(value != '' && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'color') {
	            $('#' + object + ' .colorSelector div').css('cssText', 'background-color: ' + value + ' !important;');
	          }
	          else if (value && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'image') {
                // Remove the url() from around the image url.
	            // Mozilla browsers wrap in url(""), while webkit browsers wrap in url()
	            // so we need two replacements.
	            stripped = value.replace('url("', '').replace('")', '').replace('url(', '').replace(')', '');
                var container = $('#sweaver_plugin_editor #edit-' + object + '-ajax-wrapper .form-managed-file');
                if (1){
                if (stripped != 'none') {
                  container.children('input[type="file"]').hide();
                  container.children('span').remove();
                  
                  container.prepend('<span class="file"><a href="' + stripped + '" target="_blank">' + Drupal.t('Display image') + '</a></span>');

                  container.children('#edit-' + object + '-upload-button').val(Drupal.t('Remove'));
                  container.children('#edit-' + object + '-upload-button').attr('name', object + '_remove_button');
                  container.children('#edit-' + object + '-upload-button').attr('id', 'edit-' + object + '-remove-button');
                }
                else{
                  container.children('input[type="file"]').show();
                  container.children('span').remove();
                  container.children('input[name="' + object + '[fid]"]').val(0);

                  if(container.children('input[type="file"]').length == 0){
                    container.prepend('<input type="file" id="edit-' + object + '-upload" name="files[' + object + ']" size="22" class="form-file" style="display: inline-block; ">');
                  }
                  
                  container.children('#edit-' + object + '-remove-button').val(Drupal.t('Upload'));
                  container.children('#edit-' + object + '-remove-button').attr('name', object + '_upload_button');
                  container.children('#edit-' + object + '-remove-button').attr('id', 'edit-' + object + '-upload-button');
                }
                }
	            //$("#sweaver_plugin_editor #edit-" + object).val(stripped);
	          }
              else if (value && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'checkbox') // Implement the new field checkbox
              {
                if (Drupal.Sweaver.properties[object]['options'][value] == true)
                    $("#sweaver_plugin_editor #button-checkbox-" + object).addClass('button_active');
                else $("#sweaver_plugin_editor #button-checkbox-" + object).removeClass('button_active')
              }
              else if (value && !isEmpty(Drupal.Sweaver.properties[object]) && Drupal.Sweaver.properties[object].type == 'radio') // Implement the new field radio
	          {
                $("#sweaver_plugin_editor div[id^=button-radio-" + object + "-]").removeClass('button_active');
                $("#sweaver_plugin_editor #button-radio-" + object + '-' + value).addClass('button_active');
	          }
              else {
	            if (value) {
                  if (value.substr(-1) == '%') {
                    // This value is in %
                    // We have to check if this is a correct for this field
                    // If not we will convert this value into px
                    if (!(value in Drupal.Sweaver.properties[object].options)) {
                      //Get first parent width
                      value = $(tempObject).parent().outerWidth() * value.replace('%', '') / 100;
                      value = Math.round(value);
                    }
                  }
                  // Make the sure it is a the string.
                  value = value + '';
	              $("#sweaver_plugin_editor #edit-" + object).val(value.replace('px', ''));
	            }
	          }
          }
        });
      }
    }
  }

  Drupal.Sweaver.updateMode = true;
}

/**
 * Empty form values and hide unnecessary fields.
 */
Drupal.Sweaver.initForm = function() {

  // Hide all sliders, all groups and all containers.
  Drupal.Sweaver.hideOverlays();
  $('#sweaver-editor .sweaver-group').hide();
  $('#sweaver-editor .container').hide();

  if (!isEmpty(Drupal.Sweaver.activeElement)) {
    // Decide which items should be shown or hidden.

    var type = Drupal.Sweaver.activeElement.type;
    $.each(Drupal.Sweaver.properties, function(index, object){
      if(object.name in Drupal.Sweaver.types[type]) {
        $('#sweaver .form-item-' + object.name).show();
        // From the moment that we have an visible element in a group, we need to show that group.
        $('#sweaver .form-item-' + object.name).parents('.sweaver-group').show();
        // From the moment that we have an visible element in a container, we need to show that container.
        $('#sweaver .form-item-' + object.name).parents('.container').show();
      }
      else {
        $('#sweaver .form-item-' + object.name).hide();
      }
    });
  }
}

/**
 * Show colorPicker and hook events to it
 */
Drupal.Sweaver.addColorPicker = function() {
  $('#sweaver .colorSelector').each(function() {
    var object = $(this);
    var property = object.parent().attr('id');
    object.ColorPicker({
      color: '#ffffff',
      // Determine the current color and send it to colorpicker.
      onBeforeShow: function () {
        var current_color_object = {};
        var current_color_value = ($('div', this).css('background-color')).replace('rgba(', '').replace('rgb(', '').replace(')', '').split(',');
        if (current_color_value[0] != 'transparent') {
          current_color_object.r = current_color_value[0];
          current_color_object.g = current_color_value[1];
          current_color_object.b = current_color_value[2];
          $(this).ColorPickerSetColor(current_color_object);
        }
        else {
          current_color_object.r = '255';
          current_color_object.g = '255';
          current_color_object.b = '255';
          $(this).ColorPickerSetColor(current_color_object);
        }
      },
      onShow: function (colpkr) {
        $(colpkr).fadeIn(500);
        if (object.parents('.sweaver-group-content').length == 0) {
          Drupal.Sweaver.hideOverlays();
        }
        return false;
      },
      onHide: function (colpkr) {
        $(colpkr).fadeOut(500);
        return false;
      },
      onChange: function (hsb, hex, rgb) {
      var preview = hex;
      if (hex != 'transparent') {
        preview = '#'+ hex;
      }
        $('div', object).css('cssText', 'background-color:' + preview + '!important;');
        if (Drupal.Sweaver.updateMode) {
          Drupal.Sweaver.setValue(property, hex);
        }
      }
    });
  });
}

/*
 * Add sliders through jQuery UI
 */
Drupal.Sweaver.addSliders = function() {
  $("#sweaver .slider-value").each(function() {
    $(this).after('<div class="slider-wrapper"><div id="' + $(this).attr('id').substr(5, $(this).attr('id').length - 5) + '-slider" class="slider"></div></div>');
  });

  // Move the slider to the right position on show.
  $("#sweaver .slider-value").click(function() {
    Drupal.Sweaver.updateMode = false;
    $(this).siblings('.slider-wrapper').children().slider("option", "value", $(this).val());
    Drupal.Sweaver.updateMode = true;
  });

  $("#sweaver .slider").each(function() {
    id = $(this).attr('id').replace('-slider', '');
    var minSlider = Drupal.Sweaver.properties[id].slider_min;
    if (minSlider == null || minSlider == '') {
      minSlider = 0;
    }
    var maxSlider = Drupal.Sweaver.properties[id].slider_max;
    if (maxSlider == null || maxSlider == '') {
      maxSlider = 2000;
    }
    $(this).slider({
      min: minSlider,
      max: maxSlider,
      slide: function(event, ui) {
        id = $(this).attr("id").replace('-slider','');
        $('#edit-' + id).val(ui.value);
        if (Drupal.Sweaver.updateMode) {
          Drupal.Sweaver.setValue(id, ui.value);
        }
      }
    });
  });
  
  //Double clicking on a slider delete all modifications made through the editor to the property
  $('#sweaver .slider a').bind('dblclick', function(){
    property = $(this).parent().attr('id').replace('-slider', '');
    Drupal.Sweaver.deleteProperty(Drupal.Sweaver.activePath, property);
  });
}

/**
 * Loop through all clickable area's and bind click
 */
Drupal.Sweaver.bindClicks = function() {

  // Get a list of selectors to exclude.
  var excludes = Drupal.settings.sweaver['exclude_selectors'];

  // Add hover outline object.
  $('#sweaver-frontend').append('<div style="position: absolute; top: 0; left: 0; border: 2px dotted #ccc" id="#sweaver-hover"></div>');

  // Build an object with all the elements that can be hovered/clicked
  var tempSelectors = $('body').find('*').filter(':parents(' + excludes + '):not(' + excludes + ')');

  // When an element is hovered, add a class 'sweaver-hovered'.
  if (Drupal.settings.sweaver['preview_selector']) {
    tempSelectors
    .bind('mouseenter', function(event){
      // Only do something when the content area is visible.
      if (Drupal.Sweaver.visible()) {
        tempObject = $(this);
        object = Drupal.Sweaver.buildSweaverObject(tempObject);
        // Loop through the selectors to see if the current item should be selectable.
        if (!object.translation[0]) {
          $.each(tempObject.parents(), function() {
            tempObject = $(this);
            object = Drupal.Sweaver.buildSweaverObject(tempObject);
            if (object.translation[0]) {
              return false;
            }
          });
        }
        // Make sure only one item has the outline.
        $('.sweaver-hovered').removeClass('sweaver-hovered');

        // Don't add the class on elements that cover the entire screen
        // since that would add a, annoying horizontal scrollbar.
        
        // There is actually a bug reguarding WebKit and outerHeight/outerWidth property
        // In aim to make it work we have to shortly change the display to inline-block
        var originalDisplay = tempObject.css('display');
        tempObject.css('display', 'inline-block');
        if (tempObject.outerWidth() != $(window).width()) {
          tempObject.addClass('sweaver-hovered');
        }
        tempObject.css('display', originalDisplay);
      }
    })
    .bind('mouseleave', function(event){
      // Loop through the selectors to see if the current item should be selectable.
      if (Drupal.Sweaver.visible()) {
        tempObject = $(this);
        tempObject.removeClass('sweaver-hovered');

        $.each(tempObject.parents(), function() {
          tempObject = $(this);
          object = Drupal.Sweaver.buildSweaverObject(tempObject);
          if (object.translation[0]) {
            return false;
          }
        });
        var originalDisplay = tempObject.css('display');
        tempObject.css('display', 'inline-block');
        if (tempObject.outerWidth() != $(window).width()) {
          tempObject.addClass('sweaver-hovered');
        }
        tempObject.css('display', originalDisplay);
      }
    });
  }

  // When an element is clicked, add a class and build the entire path.
  tempSelectors
  .bind('click', function (event) {
    // Only do something when the content area is visible.
    if (Drupal.Sweaver.visible()) {

      // We need to use event.target here as we need to know if we clicked on an element that should be excluded.
      // If we don't do this, then we will get the parent element of the excluded element, which is not what we want.
      tempObject = $(event.target);
      
      Drupal.Sweaver.editSelection(tempObject, event);
    }
  });

  // Hide sliders and close groups when clicking outside of them.
  $("#sweaver").click(function() {
    Drupal.Sweaver.hideOverlays();
  });

  // Update css when a fake checkbox is clicked
  $("#sweaver_plugin_editor div[id^=button-checkbox-]").click(function(){
    if ($(this).hasClass('button_active'))
      $(this).removeClass('button_active');
    else $(this).addClass('button_active');
    
    if (Drupal.Sweaver.updateMode) {
      var status = $(this).hasClass('button_active');
      var property_to_update = $(this).attr('id').replace('button-checkbox-', '');
        
      $.each(Drupal.Sweaver.properties[property_to_update]['options'], function(key, value) { 
        if (value == status)
          Drupal.Sweaver.setValue(property_to_update, key);
      });
    }
  });
  
  // Update css when a fake radio button is clicked
  $("#sweaver_plugin_editor div[id^=button-radio-]").click(function(){
    var property_to_update = $(this).attr('name');
    var value = $(this).attr('id').replace('button-radio-' + property_to_update + '-', '');
    $("#sweaver_plugin_editor div[id^=button-radio-" + property_to_update + "-]").removeClass('button_active');
    $(this).addClass('button_active');
    
    if (Drupal.Sweaver.updateMode) {
        Drupal.Sweaver.setValue(property_to_update, value);
    }
  });
  
  //Double clicking on a radio button delete all modifications made through the editor to the property
  $("#sweaver_plugin_editor div[id^=button-radio-]").bind('dblclick', function(){
    property = $(this).attr('name');
    Drupal.Sweaver.deleteProperty(Drupal.Sweaver.activePath, property);
  });

  // Update css when something (that is not checkbox or radio button) is changed in the form.
  $("#sweaver_plugin_editor input[id^=edit-], #sweaver_plugin_editor select[id^=edit-]").live('change', function(){
    if (Drupal.Sweaver.updateMode) {
      // Is this a file input ?
      if ($(this).attr('name').match('^files\[[a-zA-Z0-9_-]+\]')){
        var name = $(this).attr('name').substr(6, $(this).attr('name').length - 7);
        var button = $('#' + $(this).attr('id') + '-button');
        button.trigger('click');
        button.trigger('mousedown');    
          
        // this function check every second if the image selected has been uploaded
        (function imageValueChecker (i) {  
          var fidInput = $('#sweaver_plugin_editor input[name="' + name + '[fid]"]');
          setTimeout(function () {  
          if (fidInput.val() != 0 ){
          // Download complete
          // We proceed of the css update
            $('#edit-' + name + '-ajax-wrapper').ajaxSuccess(function(evt, request, settings){
              window.location.reload();
            });
            absolute_path = fidInput.siblings('.file').children('a').attr('href');
            relative_path = absolute_path.replace(Drupal.settings.sweaver['base_root'], '');
            Drupal.Sweaver.setValue(name ,relative_path);
            Drupal.Sweaver.SavePosition();
            Drupal.Sweaver.AutoSave();
          }               
          if (fidInput.val() == 0 && --i) imageValueChecker(i);      //  decrement i and call myLoop again if i > 0
          }, 1000);
        })(15); // If 15 seconds after the beginning of the upload it is not yet finished we can assume that there has been a problem.
      }
      else {
        Drupal.Sweaver.setValue($(this).attr('name'), $(this).val());
      }
    }
  });
  
  $('#sweaver_plugin_editor .form-managed-file input[type=submit]').live('mouseover', function(){
    if(!$(this).hasClass('event_added')){
      $(this).addClass('event_added');
      $(this).bind('mousedown', function(){
        Drupal.Sweaver.setValue($(this).attr('name').replace('_remove_button', ''), 'none');
      });
    }
  });
  
  // Show the slider when a numeric value is entered.
  $("#sweaver_plugin_editor  .slider-value").click(function(event){
    event.stopPropagation();
    $slider = $(this).siblings('.slider-wrapper');

    if ($slider.css('visibility') == 'visible') {
      // Add an active class for IE position issues.
      $slider.parent().removeClass('active');
      $slider.parents('.sweaver-group').removeClass('active');

      // Close slider again on second click.
      $slider.css({'visibility' : 'hidden'});
    }
    else {
      // Hide all other sliders.
      $('#sweaver_plugin_editor .slider-wrapper').css({'visibility' : 'hidden'});

      // Add an active class for IE position issues.
      $('#sweaver_plugin_editor .form-item, #sweaver_plugin_editor .sweaver-group').removeClass('active');
      $slider.parent().addClass('active');
      $slider.parents('.sweaver-group').addClass('active');
      
      var container = $(this).parent().parent();      
      var top =  $slider.outerHeight();
      var left = -($slider.width() / 2) + ($(this).outerWidth() / 2);
      
      if ($slider.siblings('label').is(':visible')) {
        left += $slider.siblings('label').width();
      }
      else if (container.hasClass('side')) {
        left += $(this).offset().left - container.offset().left;      
      }
      
      // Flip the slider over the input when it is too close to the bottom of the page to be displayed
      if ($('#sweaver').offset().top + $('#sweaver').height() - $(this).offset().top < 100) {
        top = 0 - top - 5;
      }  
      
      $slider.css({'left' : left, 'top' : top}).css({'visibility' : 'visible'});
    }
  });
  
  // The value of an input field can be modified with arrows
  $("#sweaver_plugin_editor  .slider-value").keydown(function(event){
    var value = $(this).val();
    switch(event.keyCode) {
      case 37:
      case 40:
        value--;
        $(this).val(value);
        Drupal.Sweaver.setValue($(this).attr('name'), value);
        break;
      
      case 38:
      case 39:
        value++;
        $(this).val(value);
        Drupal.Sweaver.setValue($(this).attr('name'), value);
        break;
    }
  });

}

/**
 * Load an object to the editor from a selector
 */
Drupal.Sweaver.editSelection = function (tempObject, event) {
  clicked_object = (event == null) ? false : true;
  if (!tempObject.parents(Drupal.settings.sweaver['exclude_selectors']).length > 0) {
    if (clicked_object) {
      event.stopPropagation();
    }

    object = Drupal.Sweaver.buildSweaverObject(tempObject);
    
    // If the clicked object is a link, or an element in a link, prevent default behavior.
    $('#follow-link').hide();
    if (object.tag == 'a' || tempObject.parents('a').length > 0) {
      var position = tempObject.offset();
      var clickObject = tempObject;
      if (object.tag != 'a') {
        clickObject = tempObject.parents('a');
      }
      if (object.id != 'follow-link') {
        $('#follow-link').attr('href', clickObject.attr('href')).css({
          'top': position.top + clickObject.outerHeight() + 5,
          'left': position.left
        }).fadeIn();
        if (clicked_object) {
          event.preventDefault();
        }
      }
    }
    // If the clicked object is a button prevent default behavior.
    if ((object.tag == 'input' || object.tag == 'label') && clicked_object) {
      event.preventDefault();
    }

    // Don't do anything if the clicked object is the 'follow-link' link.
    if (object.id != 'follow-link') {

      // Only do something if the clicked item is found in the selectors.
      if (!object.translation[0]) {
        $.each(tempObject.parents(), function () {
          tempObject = $(this);
          object = Drupal.Sweaver.buildSweaverObject(tempObject);
          if (object.translation[0]) {
            return false;
          }
        });
      }
      
      // Prevent from selecting non modifiable selectors
      if (!object.translation[0]) {
        return false;
      }

      // clear the old paths.
      $('#sweaver_plugin_editor .sweaver-header').html('<div id="full-path" class="clearfix"></div><div id="selected-path" class="clear-block"></div>');

      // Reset some values.
      Drupal.Sweaver.path.length = 0;
      Drupal.Sweaver.pathIndexes.length = 0;
      $("#selected-path").html('<span class="path-label">' + Drupal.t('Selected item: ') + '</span><span class="path-content"></span>');
      $("#full-path").html('<span class="path-label">' + Drupal.t('Full path: ') + '</span><span class="path-content"></span>');

      // Build path with parents.
      Drupal.Sweaver.buildPath(tempObject);
      Drupal.Sweaver.updateForm();
      Drupal.Sweaver.updateScreen();
    }
  }
}

/**
 * Loop through all clickable area's and bind click
 */
Drupal.Sweaver.updateScreen = function() {
  if (Drupal.settings.sweaver['preview_selector']) {
    // Add border around selected element.
    var excludes = Drupal.settings.sweaver['exclude_selectors'];
    $('.sweaver-clicked').removeClass('sweaver-clicked');
    if (Drupal.Sweaver.safeActivePath && $(Drupal.Sweaver.safeActivePath).outerWidth() != $(window).width()) {
      $(Drupal.Sweaver.safeActivePath).filter(':parents(' + excludes + '):not(' + excludes + ')').addClass('sweaver-clicked');
    }
    else {
      // Hide the 'clicked' outlines.
      $('.sweaver-clicked').removeClass('sweaver-clicked');
    }
  }
}

/**
 * Store the parents of a clicked item.
 */
Drupal.Sweaver.buildPath = function(object) {
  var index = 0;

  // Collect info on currently active item.
  Drupal.Sweaver.activeElement = Drupal.Sweaver.buildSweaverObject(object);

  // Add active element to first element in the path array.
  Drupal.Sweaver.path[0] = Drupal.Sweaver.activeElement;

  // Show the currenty active path and the full path.
  Drupal.Sweaver.addToFullPath(index, true);
  Drupal.Sweaver.addToActivePathIndex(0);

  // Traverse all parents and save them in the path array.
  var i = 1;
  var active;
  object.parents().each(function() {

    active = false;
    var parent = Drupal.Sweaver.buildSweaverObject($(this));
    if (parent.translation[0]) {
      Drupal.Sweaver.path[i] = parent;

      // If selector is tagged as 'highlight', automatically select it.
      var match = '';
      $.each(Drupal.Sweaver.selectors, function (index, selector) {
        if (selector.selector == 'sweaver_all_ids' || selector.selector == 'sweaver_all_classes' || selector.selector == 'sweaver_all_tags') {
          return false;
        }
        if (selector.selector == '#' + parent.id || selector.selector == parent.tag) {
          match = selector.selector;
          if (selector.highlight == '1') {
            active = true;
            Drupal.Sweaver.addToActivePathIndex(i);
          }
        } else {
          $.each(parent.classes, function(index, aClass) {
            if (selector.selector == '.' + aClass) {
              match = selector.selector;
              if (selector.highlight == '1') {
                active = true;
                Drupal.Sweaver.addToActivePathIndex(i);
                return false;
              }
            }
          });
        }
        if (match != '') {
         return false;
        }
      });

      // Add all items to the full path except for the html tag.
      if (parent.tag != 'html') {
        Drupal.Sweaver.addToFullPath(i, active);
      }
      i++;
    }
  });
  if (i > 2) // There are always at least 2 levels
  {
    if (!(1 in Drupal.Sweaver.pathIndexes)) {
      Drupal.Sweaver.addToActivePathIndex(1);
      $('#sweaver #full-path #sid-1').addClass('active');
    }
  }
  Drupal.Sweaver.printActivePath();
}

/**
 * Add one item to the full path.
 */
Drupal.Sweaver.addToFullPath = function(index, active) {
  var path_separator = '&nbsp;&gt;&nbsp;';
  var active_class = '';

  // Don't show a seperator after the last item in the path.
  if (index == 0) {
    path_separator = '';
  }

  // Add an active class to the selected items.
  if (active == true) {
    active_class = ' active';
  }

  // Get the list of translated selectors.
  var selectorList = Drupal.Sweaver.path[index].translation;

  // First add the default selector.
  $("#full-path .path-content").prepend('<div class="selector-wrapper' + active_class + '" id="sid-' + index + '"><div class="first-selector"><a title="' + Drupal.t('Click to add this element to the selected path') + '">' + selectorList[0] + '</a></div><div class="selector-separator">' + path_separator + '</div></div>');

  // Next add a popup with all possible selectors.
  var selectors = ''
  for (var i=1; i < selectorList.length; i++) {
    tempClass = '';
    // Add a class active to indicate the preferred selector.
    if (i == 1) {
      tempClass += 'active ';
    }
    if (i == 1) {
      tempClass += 'first ';
    }
    if (i == selectorList.length - 1) {
      tempClass += 'last';
    }
    selectors += '<li class="' + tempClass + '"><a href="#" id="ssid-' + (i-1) + '">' + selectorList[i] + '</a></li>';
  }

  // Finally, add some pseudo-classes.
  var pseudoClasses = '';
  if (Drupal.Sweaver.path[index].tag == 'a') {
    pseudoClasses += '<li class="first"><a href="#">:hover</a></li>';
    pseudoClasses += '<li><a href="#">:visited</a></li>';
    pseudoClasses += '<li><a href="#">:active</a></li>';
    pseudoClasses += '<li class="last"><a href="#" >:link</a></li>';
  }
  else {
    pseudoClasses += '<li class="first last"><a href="#" class="hover">:hover</a></li>';
  }

  $("#sid-" + index).prepend('<div class="selector-popup-opener">open</div><div class="selector-popup"><ul class="selectors">' + selectors + '</ul><ul class="pseudoclasses">' + pseudoClasses + '</ul></div>');

  // Bind click to change the active path.
  $('#sid-' + index + ' .first-selector a').click(function() {
    $(this).parent().parent().toggleClass('active');
    Drupal.Sweaver.addToActivePathIndex(index);
    Drupal.Sweaver.printActivePath();
    // Reset the active element as it might have changed.
    Drupal.Sweaver.pathIndexes.sort(function(a,b){return a - b});
    Drupal.Sweaver.activeElement = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] : {} ;
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();

    // Stop the link from doing anything.
    return false;
  });

  // Change the active path from a popup.
  $('#sid-' + index + ' .selector-popup ul.selectors a').click(function() {
    // Store in the active object that there is a new preferred selector instead of the first one defined in the backend.
    var $link = $(this);
    var i = $link.attr('id').substr(5);
    Drupal.Sweaver.path[index].preferredSelector = i;
    Drupal.Sweaver.printActivePath();
    // Replace the selector in the full path.
    $('#sid-' + index + ' .first-selector a').html(Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[index])[0]);
    // Add an active class.
    $link.parents('.selector-popup').css({'left' : '-10000px'}).parent().removeClass('open');
    $link.parent().siblings('.active').removeClass('active');
    $link.parent().addClass('active');
    // Update the form.
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();
    return false;
  });

  // Add a pseudo-class from a popup.
  $('#sid-' + index + ' .selector-popup ul.pseudoclasses a').click(function() {
    var $link = $(this);
    // If the link was already active, deactivate it otherwhise add the active class.
    if (!$link.parent().hasClass('active')) {
	    // Add the pseudo-class to the object in question.
	    Drupal.Sweaver.path[index].pseudoClass = $(this).text();
	    // Update the translation of the object in question.
	    Drupal.Sweaver.path[index].translation = Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[index]);
	    // Update the active path.
	    Drupal.Sweaver.printActivePath();
	    // Change the text in the full path.
	    $('#sid-' + index + ' .first-selector a').html(Drupal.Sweaver.path[index].translation[0]);
	    // Handle all active classes.
	    $link.parent().siblings('.active').removeClass('active');
	    $link.parent().addClass('active');
    }
    else {
      Drupal.Sweaver.path[index].pseudoClass = '';
      // Update the translation of the object in question.
      Drupal.Sweaver.path[index].translation = Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[index]);
      // Update the active path.
      Drupal.Sweaver.printActivePath();
      // Change the text in the full path.
      $('#sid-' + index + ' .first-selector a').html(Drupal.Sweaver.path[index].translation[0]);
      // Handle all active classes.
      $link.parent().removeClass('active');
	  }
    // Close the popup.
		$link.parents('.selector-popup').css({'left' : '-10000px'}).parent().removeClass('open');
    // Update the form with the new path.
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();
    return false;
  });

  // Hide/show selector popups.
  $('#sid-' + index + ' .selector-popup-opener').click(function() {
    var $popup = $(this).siblings('.selector-popup');
    $this = $(this);
    if ($this.parent().hasClass('open')) {
      $this.parent().removeClass('open');
      $popup.css({'left' : '-10000px'});
    }
    else {
      // Hide other open selector popups.
      $('#sweaver .selector-wrapper.open .selector-popup').css({'left' : '-10000px'});
      $this.parent().addClass('open');
      $this.parent().siblings().removeClass('open');
	    // Calculate the right width.
	    var width = 0;
	    $($popup.children('ul')).each(function() {
	     width += $(this).outerWidth();
	    });
      $popup.css({'width' : width});
      // See if the popup should be opened on the left or the right.
      var offset = $this.offset();
      var left = (offset.left + width) > $(window).width() ? - $popup.outerWidth() :  $this.outerWidth();
      $popup.hide().css({'left' : left});
      // Show the popup.
      $popup.slideDown('fast');
    }
  });
}

/**
 * Add an item to the active path index.
 * This way we can keep track of the selected items in the ful path.
 */
Drupal.Sweaver.addToActivePathIndex = function(i) {
  // Do not add the item when selected or remove it from Active path.
  var position = $.inArray(i, Drupal.Sweaver.pathIndexes);
  if (position < 0) {
    Drupal.Sweaver.pathIndexes.unshift(i);
  }
  else {
    // Remove from pathIndexes if necessary.
    for (var key in Drupal.Sweaver.pathIndexes) {
      if (Drupal.Sweaver.pathIndexes[key] == i) {
        Drupal.Sweaver.pathIndexes.splice(key, 1);
      }
    }
  }
}

/**
 * Print the active path.
 */
Drupal.Sweaver.printActivePath = function() {
  // Reset the previous path and add the next item to pathIndexes.
  $path = $("#selected-path .path-content");
  $path.html('');
  Drupal.Sweaver.activePath = '';
  // Since jquery cannot get a css value when a pseudo-class is in it, we have to create a version
  // of the active patch without the pseudo-classes.
  Drupal.Sweaver.safeActivePath = '';

  // Sort pathIndexes.
  Drupal.Sweaver.pathIndexes.sort(function(a,b){return a - b});

  // Print the selected path in human-readable language.

  if (Drupal.Sweaver.pathIndexes.length > 0) {
    for ( var i=0, len=Drupal.Sweaver.pathIndexes.length; i<len; ++i ){
      if (i > 0) {
        $path.append(' in ');
      }
      // See which translation should be used.
      var j = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector : 0;
      j++;
      $path.append(Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].translation[j]);
    }
    // Save the currently active css path.
    Drupal.Sweaver.pathIndexes.reverse();
    for (var i=0, len=Drupal.Sweaver.pathIndexes.length; i<len; ++i){
      // See which translation should be used.
      var j = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].preferredSelector : 0;
      j++;
      Drupal.Sweaver.activePath += Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].css[j] + Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].pseudoClass + ' ';
      Drupal.Sweaver.safeActivePath += Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[i]].css[j] + ' ';
    }
  }
  else {
    $path.html(Drupal.t('none'));
  }
}

/**
 * Fill the activeElement and update the Form and ActivePath.
 * Other plugins can use this function to set values on the
 * style tab. To switch tabs, you can use the Drupal.Sweaver.switchTab
 * function.
 */
Drupal.Sweaver.updateStyleTab = function(theClass, name) {
  // Build the object with manipulated data.
  var tempObject = Drupal.Sweaver.buildSweaverObject($('.' + theClass));

  tempObject.translation = new Array(name, name);
  tempObject.classes = new Array('.' + theClass);
  tempObject.css = new Array('.' + theClass, '.' + theClass);

  Drupal.Sweaver.activeElement = tempObject;

  // Build path with parents.
  $('#sweaver_plugin_editor .sweaver-header').html('<div id="selected-path" class="clearfix"></div>');
  Drupal.Sweaver.path[0] = new Object({'id' : Drupal.Sweaver.activeElement.id, 'class' : Drupal.Sweaver.activeElement.classes, 'pseudoClass' : '', 'tag' : Drupal.Sweaver.activeElement.tag,  'type' : Drupal.Sweaver.activeElement.type, 'translation' : Drupal.Sweaver.activeElement.translation, 'css' : Drupal.Sweaver.activeElement.css});
  Drupal.Sweaver.addToFullPath(0, true);
  Drupal.Sweaver.pathIndexes = new Array();
  Drupal.Sweaver.addToActivePathIndex(0);
  Drupal.Sweaver.printActivePath();
  Drupal.Sweaver.activePath = '.' + theClass;
  Drupal.Sweaver.updateForm();
  Drupal.Sweaver.updateScreen();
}

/**
 * Store new value and update inline css.
 */
Drupal.Sweaver.setValue = function(property, value) {
  Drupal.Sweaver.css[Drupal.Sweaver.activePath] = Drupal.Sweaver.css[Drupal.Sweaver.activePath] || {};
  Drupal.Sweaver.css[Drupal.Sweaver.activePath][property] = {
    'value' : value,
    'hidden' : false,
  };
  Drupal.Sweaver.writeCss();
}

/**
 * Delete a property from a selector.
 */
Drupal.Sweaver.deleteProperty = function(key, property) {
  var target = Drupal.Sweaver.css[key];
  Drupal.Sweaver.css[key] = {};
  for (var prop in target) {
    if (prop != property) {
      Drupal.Sweaver.css[key][prop] = target[prop];
    }
  }
  Drupal.Sweaver.writeCss();
  Drupal.Sweaver.updateForm();
}

/**
 * Translate an parent item in a human-readable name.
 */
Drupal.Sweaver.objectToReadable = function(object) {

  var translation = new Array();
  var id_translation = new Array();
  var class_translation = new Array();
  var tag_translation = new Array();

  var css = new Array();
  var id_css = new Array();
  var class_css = new Array();
  var tag_css = new Array();

  var selector = '';
  var description = '';
  var tempSelectors = new Array();
  var pseudoClass = object.pseudoClass ? object.pseudoClass : '';

  var i = 0;

  // Traverse all selectors defined in the backend and return an array with the description.
  $.each(Drupal.Sweaver.selectors, function() {
    selector = this.selector;
    name = this.name;
    description = this.description;

    if (name == 'allids') {
      if (object.id && $.inArray('#' + object.id, tempSelectors) < 0) {
        id_translation[i] = 'the ' + object.id + ' region';
        id_css[i] = '#' + object.id;
        tempSelectors.push('#' + object.id);
        i++;
      }
    }
    else if (name == 'allclasses') {
      if (object.classes && object.classes[0]) {
        $.each(object.classes, function(index, tempClass) {
          if ($.inArray(tempClass, Drupal.Sweaver.excludeClasses) < 0 && $.inArray('.' + tempClass, tempSelectors) < 0) {
            class_translation[i] = 'all ' + tempClass;
            class_css[i] = '.' + tempClass;
            tempSelectors.push('.' + tempClass);
            i++;
          }
        });
      }
    }
    else if (name == 'alltags' && $.inArray(object.tag, tempSelectors) < 0) {
      tag_translation[i] = object.tag;
      tag_css[i] = object.tag;
      tempSelectors.push(object.tag);
      i++;
    }
    else {
      if (selector == '#' + object.id && $.inArray('#' + object.id, tempSelectors) < 0) {
        id_translation[i] = description;
        id_css[i] = '#' + object.id;
        tempSelectors.push('#' + object.id);
        i++;
      } else if (selector == object.tag && $.inArray(object.tag, tempSelectors) < 0) {
        tag_translation[i] = description;
        tag_css[i] = object.tag;
        tempSelectors.push(object.tag);
        i++;
      } else {
        $.each(object.classes, function(index, tempClass) {
          if (selector == '.' + tempClass  && $.inArray(tempClass, Drupal.Sweaver.excludeClasses) < 0 && $.inArray('.' + tempClass, tempSelectors) < 0) {
            class_translation[i] = description;
            class_css[i] = '.' + tempClass;
            tempSelectors.push('.' + tempClass);
            i++;
          }
        });
      }
    }
  });

  // Merge the translation arrays.
  for (var j = 0; j < i; j++) {
    var k = id_translation[j] ? id_translation[j] : class_translation[j] ? class_translation[j] : tag_translation[j];
    translation[j] = Drupal.Sweaver.addPseudoClass(pseudoClass, k);
  }

  // Merge the css arrays.
  for (var j = 0; j < i; j++) {
    var k = id_css[j] ? id_css[j] : class_css[j] ? class_css[j] : tag_css[j];
    css[j] = k;
  }

  // Add combinations of classes, ids and tags.
  if (Drupal.settings.sweaver['combined_selectors']) {
	  t = i;
	  if (tag_translation.length > 0) {
	    $.each(tag_translation, function(index, tag) {
	      if (tag) {
			    $.each(id_translation, function(index, trans) {
			      if (trans) {
			        translation[t] = Drupal.Sweaver.addPseudoClass(pseudoClass, tag + ' + ' + trans);
			        css[t] = object.tag + id_css[index];
			        t++;
			      }
			    });
		      $.each(class_translation, function(index, trans) {
		        if (trans) {
		          translation[t] = Drupal.Sweaver.addPseudoClass(pseudoClass, tag + ' + ' + trans);
              css[t] = object.tag + class_css[index];
		          t++;
		        }
		      });
		    }
		  });
	  }
  }

  // If a prefered selector was set in the object, return that one instead of the default first one.
  index = object.preferredSelector ? object.preferredSelector : 0;
  translation.splice(0, 0, translation[index]);
  css.splice(0, 0, css[index]);

  object.translation = Drupal.settings.sweaver['translate_path'] ? translation : css;
  object.css = css;
  return translation;
}

/**
 * Add a pseudo class to the translation.
 */
Drupal.Sweaver.addPseudoClass = function(pseudoClass, original) {
  if (Drupal.settings.sweaver['translate_path']) {
    var translation = pseudoClass ? original + Drupal.t(' in the ' + pseudoClass + ' state') : original;
  }
  else {
    var translation = pseudoClass ? original + pseudoClass : original;
  }
  return translation;
}

/**
 * Save current position
 */
Drupal.Sweaver.SavePosition = function() {
  // Store the object used
  // First we need to construct this path
  path = '';
  Drupal.Sweaver.path.reverse();
  $.each(Drupal.Sweaver.path, function(index, value){
    $.each(value.classes, function(i, v){
      if (v == 'sweaver-hovered' || v == 'sweaver-clicked') {
        value.classes.splice(i);
      }
    })
    
    if (value.tag == 'html' || value.tag == 'body') {
      path += ' ' + value.tag;
    }
    else if (value.id != '') {
      path += ' #' + value.id;
    }
    else if (Object.keys( value.classes ).length !== 0 && value.classes[0] != ''){
      path += ' .' + value.classes[0];
    }
    else {
      path += ' ' + value.tag;
    }
  });
  Drupal.Sweaver.path.reverse();
  Drupal.Sweaver.cookie('sweaver_active_path', path);
  
  // Save indexed path
  indexed_path = '';
  $('#sweaver_plugin_editor #full-path div[id^=sid-].active').each(function(){
    id = $(this).attr('id').substr(4);
    $(this).find('li.active').each(function(){
      if ($(this).children().attr('id') != '') {
        sub_id = $(this).children().attr('id').substr(5);
      }
      else {
        sub_id = $(this).children().attr('class');
      }
      indexed_path += ' ' + id + '-' + sub_id;
    });
  });
  Drupal.Sweaver.cookie('sweaver_indexed_path', indexed_path);
  
  // Store the tab used
  Drupal.Sweaver.cookie('sweaver_active_vertical_tab', $('#sweaver_plugin_editor #sweaver-editor .vertical-tabs a.active').parent().attr('id'));
}

/**
 * Load a saved position in the editor (active path and tab)
 */
Drupal.Sweaver.LoadPosition = function() {
  active_path = Drupal.Sweaver.cookie('sweaver_active_path');
  indexed_path = Drupal.Sweaver.cookie('sweaver_indexed_path');
  vertical_tab = Drupal.Sweaver.cookie('sweaver_active_vertical_tab');
  
  // If a configuration has been saved lets load it
  if (active_path && indexed_path && vertical_tab){    
    tempObject = $(active_path);
    
    // Load active path in the editor
    Drupal.Sweaver.editSelection(tempObject);
    
    // Reset full path
    $('#sweaver_plugin_editor #full-path div[id^=sid-]').removeClass('active');
    Drupal.Sweaver.pathIndexes = [];
    
    // Apply indexed path
    $.each(indexed_path.split(' '), function(index, value){
      specific_path = value.split('-');
      if (specific_path.length == 2) {
        $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0]).addClass('active');
        Drupal.Sweaver.addToActivePathIndex(specific_path[0]);
        Drupal.Sweaver.pathIndexes.sort(function(a,b){return a - b});
        
        if (specific_path[1].match('^[0-9]+$')) {
        // Alternative Class  
          Drupal.Sweaver.path[specific_path[0]].preferredSelector = specific_path[1];
          
          $('#sid-' + specific_path[0] + ' .first-selector a').html(Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[specific_path[0]])[0]);
          
          $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0] + ' .selectors li').removeClass('active');
          $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0] + ' #ssid-' + specific_path[1]).parent().addClass('active');
        }
        else {
        // Pseudo Class
          Drupal.Sweaver.path[specific_path[0]].pseudoClass = ':' + specific_path[1];
          Drupal.Sweaver.path[specific_path[0]].translation = Drupal.Sweaver.objectToReadable(Drupal.Sweaver.path[specific_path[0]]);
          $('#sid-' + specific_path[0] + ' .first-selector a').html(Drupal.Sweaver.path[specific_path[0]].translation[0]);
          
          $('#sweaver_plugin_editor #full-path #sid-' + specific_path[0] + ' .pseudoclasses .' + specific_path[1]).parent().addClass('active');
        }
      }
    });
    Drupal.Sweaver.printActivePath();
    Drupal.Sweaver.activeElement = Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] ? Drupal.Sweaver.path[Drupal.Sweaver.pathIndexes[0]] : {} ;
    Drupal.Sweaver.updateForm();
    Drupal.Sweaver.updateScreen();
    
    $('#sweaver_plugin_editor #sweaver-editor #' + vertical_tab + ' a').click();
    
    Drupal.Sweaver.cookie('sweaver_active_path', null);
    Drupal.Sweaver.cookie('sweaver_indexed_path', null);
    Drupal.Sweaver.cookie('sweaver_active_vertical_tab', null);
  }
}


/**
 * Build a Sweaver object.
 */
Drupal.Sweaver.buildSweaverObject = function(object) {
  var tempObject = new Object;
  tempObject.id = object.attr('id');
  tempObject.classes = trim(object.attr('class')).split(' ');
  tempObject.pseudoClass = '';
  tempObject.tag = object.get(0).tagName.toLowerCase();
  tempObject.type = object.css('display');

  // Fallback to block if an unknow type is detected.
  if (!(tempObject.type in Drupal.Sweaver.types)) {
    tempObject.type = 'block';
  }

  // Generate a human-readable name and a css selector.
  Drupal.Sweaver.objectToReadable(tempObject);
  return tempObject;
}

/**
 * Helper function to remove trailing leading and multiple spaces.
 */
function trim(s) {
  s = s.replace(/(^\s*)|(\s*$)/gi,"");
  s = s.replace(/[ ]{2,}/gi," ");
  s = s.replace(/\n /,"\n");
  return s;
}

/**
 * Hide all sliders.
 */
Drupal.Sweaver.hideOverlays = function() {
  $('#sweaver .slider-wrapper').css({'visibility' : 'hidden'});

  // Remove all active classes from form-items and groups
  $('#sweaver_plugin_editor .form-item, #sweaver_plugin_editor .sweaver-group').removeClass('active');
}

/**
 * Check wether the editor tab is visible.
 */
Drupal.Sweaver.visible = function() {
  if (Drupal.Sweaver.open == 'true' && $('#sweaver_plugin_editor .sweaver-content').is(':visible')) {
    return true;
  }
  else {
    return false;
  }
}

/**
 * Helper function to check if an object is empty.
 */
function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}


/**
 * Add custom expression to exclude all selectors in the sweaver bar.
 */
$.expr[':'].parents = function(a,i,m){
  return jQuery(a).parents(m[3]).length < 1;
};

})(jQuery);;
/*
 * jQuery JSON Plugin
 * version: 2.1 (2009-08-14)
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Brantley Harris wrote this plugin. It is based somewhat on the JSON.org 
 * website's http://www.json.org/json2.js, which proclaims:
 * "NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.", a sentiment that
 * I uphold.
 *
 * It is also influenced heavily by MochiKit's serializeJSON, which is 
 * copyrighted 2005 by Bob Ippolito.
 */
 
(function($) {
    /** jQuery.toJSON( json-serializble )
        Converts the given argument into a JSON respresentation.

        If an object has a "toJSON" function, that will be used to get the representation.
        Non-integer/string keys are skipped in the object, as are keys that point to a function.

        json-serializble:
            The *thing* to be converted.
     **/
    $.toJSON = function(o)
    {
        if (typeof(JSON) == 'object' && JSON.stringify)
            return JSON.stringify(o);
        
        var type = typeof(o);
    
        if (o === null)
            return "null";
    
        if (type == "undefined")
            return undefined;
        
        if (type == "number" || type == "boolean")
            return o + "";
    
        if (type == "string")
            return $.quoteString(o);
    
        if (type == 'object')
        {
            if (typeof o.toJSON == "function") 
                return $.toJSON( o.toJSON() );
            
            if (o.constructor === Date)
            {
                var month = o.getUTCMonth() + 1;
                if (month < 10) month = '0' + month;

                var day = o.getUTCDate();
                if (day < 10) day = '0' + day;

                var year = o.getUTCFullYear();
                
                var hours = o.getUTCHours();
                if (hours < 10) hours = '0' + hours;
                
                var minutes = o.getUTCMinutes();
                if (minutes < 10) minutes = '0' + minutes;
                
                var seconds = o.getUTCSeconds();
                if (seconds < 10) seconds = '0' + seconds;
                
                var milli = o.getUTCMilliseconds();
                if (milli < 100) milli = '0' + milli;
                if (milli < 10) milli = '0' + milli;

                return '"' + year + '-' + month + '-' + day + 'T' +
                             hours + ':' + minutes + ':' + seconds + 
                             '.' + milli + 'Z"'; 
            }

            if (o.constructor === Array) 
            {
                var ret = [];
                for (var i = 0; i < o.length; i++)
                    ret.push( $.toJSON(o[i]) || "null" );

                return "[" + ret.join(",") + "]";
            }
        
            var pairs = [];
            for (var k in o) {
                var name;
                var type = typeof k;

                if (type == "number")
                    name = '"' + k + '"';
                else if (type == "string")
                    name = $.quoteString(k);
                else
                    continue;  //skip non-string or number keys
            
                if (typeof o[k] == "function") 
                    continue;  //skip pairs where the value is a function.
            
                var val = $.toJSON(o[k]);
            
                pairs.push(name + ":" + val);
            }

            return "{" + pairs.join(", ") + "}";
        }
    };

    /** jQuery.evalJSON(src)
        Evaluates a given piece of json source.
     **/
    $.evalJSON = function(src)
    {
        if (typeof(JSON) == 'object' && JSON.parse)
            return JSON.parse(src);
        return eval("(" + src + ")");
    };
    
    /** jQuery.secureEvalJSON(src)
        Evals JSON in a way that is *more* secure.
    **/
    $.secureEvalJSON = function(src)
    {
        if (typeof(JSON) == 'object' && JSON.parse)
            return JSON.parse(src);
        
        var filtered = src;
        filtered = filtered.replace(/\\["\\\/bfnrtu]/g, '@');
        filtered = filtered.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
        filtered = filtered.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
        
        if (/^[\],:{}\s]*$/.test(filtered))
            return eval("(" + src + ")");
        else
            throw new SyntaxError("Error parsing JSON, source is not valid.");
    };

    /** jQuery.quoteString(string)
        Returns a string-repr of a string, escaping quotes intelligently.  
        Mostly a support function for toJSON.
    
        Examples:
            >>> jQuery.quoteString("apple")
            "apple"
        
            >>> jQuery.quoteString('"Where are we going?", she asked.')
            "\"Where are we going?\", she asked."
     **/
    $.quoteString = function(string)
    {
        if (string.match(_escapeable))
        {
            return '"' + string.replace(_escapeable, function (a) 
            {
                var c = _meta[a];
                if (typeof c === 'string') return c;
                c = a.charCodeAt();
                return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            }) + '"';
        }
        return '"' + string + '"';
    };
    
    var _escapeable = /["\\\x00-\x1f\x7f-\x9f]/g;
    
    var _meta = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    };
})(jQuery);
;
/**
 *
 * Color picker
 * Author: Stefan Petre www.eyecon.ro
 *
 * Dual licensed under the MIT and GPL licenses
 *
 */
(function ($) {
	var ColorPicker = function () {
		var
			ids = {},
			inAction,
			charMin = 65,
			visible,
			tpl = '<div class="colorpicker"><div class="colorpicker_color"><div><div></div></div></div><div class="colorpicker_hue"><div></div></div><div class="colorpicker_new_color"></div><div class="colorpicker_current_color"></div><div class="colorpicker_hex"><input type="text" maxlength="6" size="6" /></div><div class="colorpicker_rgb_r colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_rgb_g colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_rgb_b colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_hsb_h colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_hsb_s colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_hsb_b colorpicker_field"><input type="text" maxlength="3" size="3" /><span></span></div><div class="colorpicker_transparent"><a href="" title="Make transparent" alt="Make transparent">Transparent</a></div><div class="colorpicker_submit"></div><div class="colorpicker_previous_colors"></div></div>',
			defaults = {
				eventName: 'click',
				onShow: function () {},
				onBeforeShow: function(){},
				onHide: function () {},
				onChange: function () {},
				onSubmit: function () {},
				color: 'ff0000',
				livePreview: true,
				flat: false
			},
			fillRGBFields = function  (hsb, cal) {
				var rgb = HSBToRGB(hsb);
				$(cal).data('colorpicker').fields
					.eq(1).val(rgb.r).end()
					.eq(2).val(rgb.g).end()
					.eq(3).val(rgb.b).end();
			},
			fillHSBFields = function  (hsb, cal) {
				$(cal).data('colorpicker').fields
					.eq(4).val(hsb.h).end()
					.eq(5).val(hsb.s).end()
					.eq(6).val(hsb.b).end();
			},
			fillHexFields = function (hsb, cal) {
				$(cal).data('colorpicker').fields
					.eq(0).val(HSBToHex(hsb)).end();
			},
			setSelector = function (hsb, cal) {
				$(cal).data('colorpicker').selector.css('backgroundColor', '#' + HSBToHex({h: hsb.h, s: 100, b: 100}));
				$(cal).data('colorpicker').selectorIndic.css({
					left: parseInt(150 * hsb.s/100, 10),
					top: parseInt(150 * (100-hsb.b)/100, 10)
				});
			},
			setHue = function (hsb, cal) {
				$(cal).data('colorpicker').hue.css('top', parseInt(150 - 150 * hsb.h/360, 10));
			},
			setCurrentColor = function (hsb, cal) {
				$(cal).data('colorpicker').currentColor.css('backgroundColor', '#' + HSBToHex(hsb));
			},
			setNewColor = function (hsb, cal) {
				$(cal).data('colorpicker').newColor.css('backgroundColor', '#' + HSBToHex(hsb));
			},
			keyDown = function (ev) {
				var pressedKey = ev.charCode || ev.keyCode || -1;
				if ((pressedKey > charMin && pressedKey <= 90) || pressedKey == 32) {
					return false;
				}
				var cal = $(this).parent().parent();
				if (cal.data('colorpicker').livePreview === true) {
					change.apply(this);
				}
			},
			change = function (ev) {
				var cal = $(this).parent().parent(), col;
				if (this.parentNode.className.indexOf('_hex') > 0) {
					cal.data('colorpicker').color = col = HexToHSB(fixHex(this.value));
				} else if (this.parentNode.className.indexOf('_hsb') > 0) {
					cal.data('colorpicker').color = col = fixHSB({
						h: parseInt(cal.data('colorpicker').fields.eq(4).val(), 10),
						s: parseInt(cal.data('colorpicker').fields.eq(5).val(), 10),
						b: parseInt(cal.data('colorpicker').fields.eq(6).val(), 10)
					});
				} else {
					cal.data('colorpicker').color = col = RGBToHSB(fixRGB({
						r: parseInt(cal.data('colorpicker').fields.eq(1).val(), 10),
						g: parseInt(cal.data('colorpicker').fields.eq(2).val(), 10),
						b: parseInt(cal.data('colorpicker').fields.eq(3).val(), 10)
					}));
				}
				if (ev) {
					fillRGBFields(col, cal.get(0));
					fillHexFields(col, cal.get(0));
					fillHSBFields(col, cal.get(0));
				}
				setSelector(col, cal.get(0));
				setHue(col, cal.get(0));
				setNewColor(col, cal.get(0));
				cal.data('colorpicker').onChange.apply(cal, [col, HSBToHex(col), HSBToRGB(col)]);
			},
			blur = function (ev) {
				var cal = $(this).parent().parent();
				cal.data('colorpicker').fields.parent().removeClass('colorpicker_focus');
			},
			focus = function () {
				charMin = this.parentNode.className.indexOf('_hex') > 0 ? 70 : 65;
				$(this).parent().parent().data('colorpicker').fields.parent().removeClass('colorpicker_focus');
				$(this).parent().addClass('colorpicker_focus');
			},
			downIncrement = function (ev) {
				var field = $(this).parent().find('input').focus();
				var current = {
					el: $(this).parent().addClass('colorpicker_slider'),
					max: this.parentNode.className.indexOf('_hsb_h') > 0 ? 360 : (this.parentNode.className.indexOf('_hsb') > 0 ? 100 : 255),
					y: ev.pageY,
					field: field,
					val: parseInt(field.val(), 10),
					preview: $(this).parent().parent().data('colorpicker').livePreview
				};
				$(document).bind('mouseup', current, upIncrement);
				$(document).bind('mousemove', current, moveIncrement);
			},
			moveIncrement = function (ev) {
				ev.data.field.val(Math.max(0, Math.min(ev.data.max, parseInt(ev.data.val + ev.pageY - ev.data.y, 10))));
				if (ev.data.preview) {
					change.apply(ev.data.field.get(0), [true]);
				}
				return false;
			},
			upIncrement = function (ev) {
				change.apply(ev.data.field.get(0), [true]);
				ev.data.el.removeClass('colorpicker_slider').find('input').focus();
				$(document).unbind('mouseup', upIncrement);
				$(document).unbind('mousemove', moveIncrement);
				return false;
			},
			downHue = function (ev) {
				var current = {
					cal: $(this).parent(),
					y: $(this).offset().top
				};
				current.preview = current.cal.data('colorpicker').livePreview;
				$(document).bind('mouseup', current, upHue);
				$(document).bind('mousemove', current, moveHue);
        sweaver_add_colors(ev);
        return false;
			},
			moveHue = function (ev) {
				change.apply(
					ev.data.cal.data('colorpicker')
						.fields
						.eq(4)
						.val(parseInt(360*(150 - Math.max(0,Math.min(150,(ev.pageY - ev.data.y))))/150, 10))
						.get(0),
					[ev.data.preview]
				);
				return false;
			},
			upHue = function (ev) {
				fillRGBFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				fillHexFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				$(document).unbind('mouseup', upHue);
				$(document).unbind('mousemove', moveHue);
        sweaver_add_colors(ev);
				return false;
			},
			downSelector = function (ev) {
				var current = {
					cal: $(this).parent(),
					pos: $(this).offset()
				};
				current.preview = current.cal.data('colorpicker').livePreview;
				$(document).bind('mouseup', current, upSelector);
				$(document).bind('mousemove', current, moveSelector);
			},

      // ************************
      // Sweaver additions
      // ************************

			// Do selection also when clicking.
			clickSelector = function (ev) {
				var current = {
					cal: $(this).parent(),
					pos: $(this).offset()
				};
				current.preview = current.cal.data('colorpicker').livePreview;
				ev.data = {};
				ev.data.cal = current.cal;
				ev.data.pos = current.pos;
				moveSelector(ev);
			},

			// Add a transparent option as background-color.
			makeTransparent = function(ev) {
				var cal = $(this).parent().parent(), col;
				cal.data('colorpicker').onChange.apply(cal, ['transparent', 'transparent', 'transparent']);
				return false;
			},

      // Select previous color.
      selectPreviousColor = function(ev) {

        // Create new color.
        var new_color = {};
        color = $(this).css('background-color').replace('rgb(', '').replace(')', '').split(',');
        new_color.r = color[0];
        new_color.g = color[1];
        new_color.b = color[2];
        new_color = fixRGB(new_color);
        new_color = RGBToHSB(new_color);
        new_color = fixHSB(new_color);

        var cal = $(this).parent().parent(), col;

        // Set the new color.
        fillRGBFields(new_color, cal);
        fillHexFields(new_color, cal);
        fillHSBFields(new_color, cal);
        setSelector(new_color, cal);
        setHue(new_color, cal);
        setNewColor(new_color, cal);
        cal.data('colorpicker').onChange.apply(cal, [new_color, HSBToHex(new_color), HSBToRGB(new_color)]);

        // Update pallet.
        sweaver_add_colors(ev);
      },

      // Add previous colors.
      sweaver_add_colors = function (ev) {
        colors = '';
        var new_color = '';
        previous_colors = new Array;

        for (var key in Drupal.Sweaver.css) {
          var target = Drupal.Sweaver.css[key];
          for (var prop in target) {
            if (Drupal.Sweaver.properties[prop]) {
              var properties = Drupal.Sweaver.properties[prop]['property'].split(' ');
              $.each(properties, function(i, property) {
                // Don't add a prefix and suffix for these exceptions.
                if ((property == 'background-color' || property == 'color') && target[prop] != 'transparent' && $.inArray(target[prop], previous_colors) < 0) {
                  previous_colors.push(target[prop]);
                  colors += '<div class="colorpicker_previous_colors_color" style="background-color: #'+ target[prop] +';"></div>';
                }
              });
            }
          }
        }

        var cal = $(this).parent().parent(), col;

        $('.colorpicker_previous_colors').html(colors);
        // Bind on colorpicker_previous_colors_color.
        $('.colorpicker_previous_colors_color').bind('click', selectPreviousColor);
      },

      // ************************
      // End of sweaver additions
      // ************************

			moveSelector = function (ev) {
				change.apply(
					ev.data.cal.data('colorpicker')
						.fields
						.eq(6)
						.val(parseInt(100*(150 - Math.max(0,Math.min(150,(ev.pageY - ev.data.pos.top))))/150, 10))
						.end()
						.eq(5)
						.val(parseInt(100*(Math.max(0,Math.min(150,(ev.pageX - ev.data.pos.left))))/150, 10))
						.get(0),
					[ev.data.preview]
				);
				return false;
			},
			upSelector = function (ev) {
				fillRGBFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				fillHexFields(ev.data.cal.data('colorpicker').color, ev.data.cal.get(0));
				$(document).unbind('mouseup', upSelector);
				$(document).unbind('mousemove', moveSelector);
        sweaver_add_colors(ev);
				return false;
			},
			enterSubmit = function (ev) {
				$(this).addClass('colorpicker_focus');
			},
			leaveSubmit = function (ev) {
				$(this).removeClass('colorpicker_focus');
			},
			clickSubmit = function (ev) {
				var cal = $(this).parent();
				var col = cal.data('colorpicker').color;
				cal.data('colorpicker').origColor = col;
				setCurrentColor(col, cal.get(0));
				cal.data('colorpicker').onSubmit(col, HSBToHex(col), HSBToRGB(col), cal.data('colorpicker').el);
			},
			show = function (ev) {
				var cal = $('#' + $(this).data('colorpickerId'));
				cal.data('colorpicker').onBeforeShow.apply(this, [cal.get(0)]);
				var pos = $(this).offset();
				var viewPort = getViewport();
				var top = pos.top + this.offsetHeight;
				var left = pos.left;
				if (top + 176 > viewPort.t + viewPort.h) {
					top -= this.offsetHeight + 176;
				}
				if (left + 356 > viewPort.l + viewPort.w) {
					left -= 356;
				}
				cal.css({left: left + 'px', top: top + 'px'});
				if (cal.data('colorpicker').onShow.apply(this, [cal.get(0)]) != false) {
					cal.show();
				}
				$(document).bind('mousedown', {cal: cal}, hide);
        sweaver_add_colors(ev);
				return false;
			},
			hide = function (ev) {
				if (!isChildOf(ev.data.cal.get(0), ev.target, ev.data.cal.get(0))) {
					if (ev.data.cal.data('colorpicker').onHide.apply(this, [ev.data.cal.get(0)]) != false) {
						ev.data.cal.hide();
					}
					$(document).unbind('mousedown', hide);
				}
			},
			isChildOf = function(parentEl, el, container) {
				if (parentEl == el) {
					return true;
				}
				if (parentEl.contains) {
					return parentEl.contains(el);
				}
				if ( parentEl.compareDocumentPosition ) {
					return !!(parentEl.compareDocumentPosition(el) & 16);
				}
				var prEl = el.parentNode;
				while(prEl && prEl != container) {
					if (prEl == parentEl)
						return true;
					prEl = prEl.parentNode;
				}
				return false;
			},
			getViewport = function () {
				var m = document.compatMode == 'CSS1Compat';
				return {
					l : window.pageXOffset || (m ? document.documentElement.scrollLeft : document.body.scrollLeft),
					t : window.pageYOffset || (m ? document.documentElement.scrollTop : document.body.scrollTop),
					w : window.innerWidth || (m ? document.documentElement.clientWidth : document.body.clientWidth),
					h : window.innerHeight || (m ? document.documentElement.clientHeight : document.body.clientHeight)
				};
			},
			fixHSB = function (hsb) {
				return {
					h: Math.min(360, Math.max(0, hsb.h)),
					s: Math.min(100, Math.max(0, hsb.s)),
					b: Math.min(100, Math.max(0, hsb.b))
				};
			},
			fixRGB = function (rgb) {
				return {
					r: Math.min(255, Math.max(0, rgb.r)),
					g: Math.min(255, Math.max(0, rgb.g)),
					b: Math.min(255, Math.max(0, rgb.b))
				};
			},
			fixHex = function (hex) {
				var len = 6 - hex.length;
				if (len > 0) {
					var o = [];
					for (var i=0; i<len; i++) {
						o.push('0');
					}
					o.push(hex);
					hex = o.join('');
				}
				return hex;
			},
			HexToRGB = function (hex) {
				var hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
				return {r: hex >> 16, g: (hex & 0x00FF00) >> 8, b: (hex & 0x0000FF)};
			},
			HexToHSB = function (hex) {
				return RGBToHSB(HexToRGB(hex));
			},
			RGBToHSB = function (rgb) {
				var hsb = {
					h: 0,
					s: 0,
					b: 0
				};
				var min = Math.min(rgb.r, rgb.g, rgb.b);
				var max = Math.max(rgb.r, rgb.g, rgb.b);
				var delta = max - min;
				hsb.b = max;
				if (max != 0) {

				}
				hsb.s = max != 0 ? 255 * delta / max : 0;
				if (hsb.s != 0) {
					if (rgb.r == max) {
						hsb.h = (rgb.g - rgb.b) / delta;
					} else if (rgb.g == max) {
						hsb.h = 2 + (rgb.b - rgb.r) / delta;
					} else {
						hsb.h = 4 + (rgb.r - rgb.g) / delta;
					}
				} else {
					hsb.h = -1;
				}
				hsb.h *= 60;
				if (hsb.h < 0) {
					hsb.h += 360;
				}
				hsb.s *= 100/255;
				hsb.b *= 100/255;

        // Sweaver : round to avoid minor differences when re-selecting colors.
        hsb.h = Math.round(hsb.h);
        hsb.s = Math.round(hsb.s);
        hsb.b = Math.round(hsb.b);

				return hsb;
			},
			HSBToRGB = function (hsb) {
				var rgb = {};
				var h = Math.round(hsb.h);
				var s = Math.round(hsb.s*255/100);
				var v = Math.round(hsb.b*255/100);
				if(s == 0) {
					rgb.r = rgb.g = rgb.b = v;
				} else {
					var t1 = v;
					var t2 = (255-s)*v/255;
					var t3 = (t1-t2)*(h%60)/60;
					if(h==360) h = 0;
					if(h<60) {rgb.r=t1;	rgb.b=t2; rgb.g=t2+t3}
					else if(h<120) {rgb.g=t1; rgb.b=t2;	rgb.r=t1-t3}
					else if(h<180) {rgb.g=t1; rgb.r=t2;	rgb.b=t2+t3}
					else if(h<240) {rgb.b=t1; rgb.r=t2;	rgb.g=t1-t3}
					else if(h<300) {rgb.b=t1; rgb.g=t2;	rgb.r=t2+t3}
					else if(h<360) {rgb.r=t1; rgb.g=t2;	rgb.b=t1-t3}
					else {rgb.r=0; rgb.g=0;	rgb.b=0}
				}
				return {r:Math.round(rgb.r), g:Math.round(rgb.g), b:Math.round(rgb.b)};
			},
			RGBToHex = function (rgb) {
				var hex = [
					rgb.r.toString(16),
					rgb.g.toString(16),
					rgb.b.toString(16)
				];
				$.each(hex, function (nr, val) {
					if (val.length == 1) {
						hex[nr] = '0' + val;
					}
				});
				return hex.join('');
			},
			HSBToHex = function (hsb) {
				return RGBToHex(HSBToRGB(hsb));
			},
			restoreOriginal = function () {
				var cal = $(this).parent();
				var col = cal.data('colorpicker').origColor;
				cal.data('colorpicker').color = col;
				fillRGBFields(col, cal.get(0));
				fillHexFields(col, cal.get(0));
				fillHSBFields(col, cal.get(0));
				setSelector(col, cal.get(0));
				setHue(col, cal.get(0));
				setNewColor(col, cal.get(0));
			};
		return {
			init: function (opt) {
				opt = $.extend({}, defaults, opt||{});
				if (typeof opt.color == 'string') {
					opt.color = HexToHSB(opt.color);
				} else if (opt.color.r != undefined && opt.color.g != undefined && opt.color.b != undefined) {
					opt.color = RGBToHSB(opt.color);
				} else if (opt.color.h != undefined && opt.color.s != undefined && opt.color.b != undefined) {
					opt.color = fixHSB(opt.color);
				} else {
					return this;
				}
				return this.each(function () {
					if (!$(this).data('colorpickerId')) {
						var options = $.extend({}, opt);
						options.origColor = opt.color;
						var id = 'collorpicker_' + parseInt(Math.random() * 1000);
						$(this).data('colorpickerId', id);
						var cal = $(tpl).attr('id', id);
						if (options.flat) {
							cal.appendTo(this).show();
						} else {
							cal.appendTo(document.body);
						}
						options.fields = cal
											.find('input')
												.bind('keyup', keyDown)
												.bind('change', change)
												.bind('blur', blur)
												.bind('focus', focus);
						cal
							.find('span').bind('mousedown', downIncrement).end()
							.find('>div.colorpicker_current_color').bind('click', restoreOriginal);
						// Also add clickselector on click.
						options.selector = cal.find('div.colorpicker_color').bind('mousedown', downSelector).bind('click', clickSelector);
						options.selectorIndic = options.selector.find('div div');
						options.el = this;
						options.hue = cal.find('div.colorpicker_hue div');
						cal.find('div.colorpicker_hue').bind('mousedown', downHue);
						options.newColor = cal.find('div.colorpicker_new_color');
						options.currentColor = cal.find('div.colorpicker_current_color');
						cal.data('colorpicker', options);
						cal.find('div.colorpicker_submit')
							.bind('mouseenter', enterSubmit)
							.bind('mouseleave', leaveSubmit)
							.bind('click', clickSubmit);
						// Transparent.
						cal.find('div.colorpicker_transparent a').bind('click', makeTransparent);
						fillRGBFields(options.color, cal.get(0));
						fillHSBFields(options.color, cal.get(0));
						fillHexFields(options.color, cal.get(0));
						setHue(options.color, cal.get(0));
						setSelector(options.color, cal.get(0));
						setCurrentColor(options.color, cal.get(0));
						setNewColor(options.color, cal.get(0));
						if (options.flat) {
							cal.css({
								position: 'relative',
								display: 'block'
							});
						} else {
							$(this).bind(options.eventName, show);
						}
					}
				});
			},
			showPicker: function() {
				return this.each( function () {
					if ($(this).data('colorpickerId')) {
						show.apply(this);
					}
				});
			},
			hidePicker: function() {
				return this.each( function () {
					if ($(this).data('colorpickerId')) {
						$('#' + $(this).data('colorpickerId')).hide();
					}
				});
			},
			setColor: function(col) {
				if (typeof col == 'string') {
					col = HexToHSB(col);
				} else if (col.r != undefined && col.g != undefined && col.b != undefined) {
					col = RGBToHSB(col);
				} else if (col.h != undefined && col.s != undefined && col.b != undefined) {
					col = fixHSB(col);
				} else {
					return this;
				}
				return this.each(function(){
					if ($(this).data('colorpickerId')) {
						var cal = $('#' + $(this).data('colorpickerId'));
						cal.data('colorpicker').color = col;
						cal.data('colorpicker').origColor = col;
						fillRGBFields(col, cal.get(0));
						fillHSBFields(col, cal.get(0));
						fillHexFields(col, cal.get(0));
						setHue(col, cal.get(0));
						setSelector(col, cal.get(0));
						setCurrentColor(col, cal.get(0));
						setNewColor(col, cal.get(0));
					}
				});
			}
		};
	}();
	$.fn.extend({
		ColorPicker: ColorPicker.init,
		ColorPickerHide: ColorPicker.hidePicker,
		ColorPickerShow: ColorPicker.showPicker,
		ColorPickerSetColor: ColorPicker.setColor
	});
})(jQuery);

/**
 * @file
 * Styles javascript.
 */

(function ($) {

/**
 * Start autosave poller.
 */
$(document).ready(function() {
  var span = 0;
  if (Drupal.settings.sweaver['autosave'] != undefined) {
	var interval = Drupal.settings.sweaver['autosave'];
    if (parseInt(interval) > 0) {
      var interval = (interval * 1000) + span;
      var autosave = setInterval('Drupal.Sweaver.AutoSave()', interval);
      span += 100;
    }
  }
});

/**
 * Always save when leaving the page.
 */
$(window).unload(function() {
  Drupal.Sweaver.AutoSave();
});

/**
 * Autosave function.
 */
Drupal.Sweaver.AutoSave = function(context) {
  if (Drupal.Sweaver.changed) {
    Drupal.Sweaver.changed = false;
  	
    var ajax_data = {};
    
    // Get values for css, customcss & palette (if available)
    if ($('[name=sweaver-css]').length) {
      ajax_data.css = $('[name=sweaver-css]').val();
    }
    if ($('#edit-sweaver-plugin-custom-css').length) {
      ajax_data.customcss = $('#edit-sweaver-plugin-custom-css').val();      
    }
    if ($('[name=sweaver-plugin-palette]').length) {
      ajax_data.palette = $('[name=sweaver-plugin-palette]').val();
    }
    var managed_file_fid = 0;
    $('#sweaver input[type=hidden][name$="[fid]"]').each(function(){ 
      if ($(this).val() != 0){
        ajax_data.managed_file_fid = $(this).val();
      }
    });

    $.ajax({
      type: "POST",
      url: Drupal.settings.basePath + 'index.php?q=sweaver-autosave',
      data: ajax_data,
      dataType: 'json',
      timeout: 5000,
      success: function(data){
        if (typeof data['message'] == 'undefined' || data['message'] != 0) {
          Drupal.Sweaver.setMessage(Drupal.t('Your changes have been saved.'), 2000);
        }
        if (typeof data['error'] == 'undefined' || data['error'] != 0) {
          Drupal.Sweaver.setMessage(Drupal.t('Your changes have been saved.'), 2000);
        }
      },
      error: function() {
        Drupal.Sweaver.setMessage(Drupal.t('There was an error saving current changes!'), 2000);
      }
    });
    return false;
  }	  
}

/**
 * Behaviors for style actions.
 */
Drupal.behaviors.StylesActions = {
  attach: function(context) {
    $("#style-actions-data-1 select.radio-style-save-type").change(function() {
      var radio_style_save_type = $("#style-actions-data-1 select.radio-style-save-type option:selected").val();
      if (radio_style_save_type == 1) {
        $('#edit-save-style').hide();
        $('#edit-style-existing-id').show();
      }
      else {
        $('#edit-save-style').show();
        $('#edit-style-existing-id').hide();
      }
    });

    $("#sweaver-popup #edit-delete-confirm").click(function() {
      $('#sweaver-popup .delete-style-confirm').hide();
      $('#sweaver-popup .delete-style-question').show();
      return false;
    });

    $("#sweaver-popup #edit-delete-cancel").click(function() {
      $('#sweaver-popup .delete-style-confirm').show();
      $('#sweaver-popup .delete-style-question').hide();
      return false;
    });
  }
};

})(jQuery);;
