/* PANZOOM EXTENSION */

/*!
Copyright (c) The Cytoscape Consortium
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

;(function(){ 'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape, $ ){
    if( !cytoscape || !$ ){ return; } // can't register if cytoscape or jquery unspecified

    $.fn.cyPanzoom = $.fn.cytoscapePanzoom = function( options ){
      panzoom.apply( this, [ options, cytoscape, $ ] );

      return this; // chainability
    };

    // if you want a core extension
    cytoscape('core', 'panzoom', function( options ){ // could use options object, but args are up to you
      panzoom.apply( this, [ options, cytoscape, $ ] );

      return this; // chainability
    });

  };

  var defaults = {
    zoomFactor: 0.05, // zoom factor per zoom tick
    zoomDelay: 45, // how many ms between zoom ticks
    minZoom: 0.1, // min zoom level
    maxZoom: 10, // max zoom level
    fitPadding: 50, // padding when fitting
    panSpeed: 10, // how many ms in between pan ticks
    panDistance: 10, // max pan distance per tick
    panDragAreaSize: 75, // the length of the pan drag box in which the vector for panning is calculated (bigger = finer control of pan speed and direction)
    panMinPercentSpeed: 0.25, // the slowest speed we can pan by (as a percent of panSpeed)
    panInactiveArea: 8, // radius of inactive area in pan drag box
    panIndicatorMinOpacity: 0.5, // min opacity of pan indicator (the draggable nib); scales from this to 1.0
    zoomOnly: false, // a minimal version of the ui only with zooming (useful on systems with bad mousewheel resolution)
    fitSelector: undefined, // selector of elements to fit
    animateOnFit: function(){ // whether to animate on fit
      return false;
    },
    fitAnimationDuration: 1000, // duration of animation on fit

    // icon class names
    sliderHandleIcon: 'fa fa-minus',
    zoomInIcon: 'fa fa-plus',
    zoomOutIcon: 'fa fa-minus',
    resetIcon: 'fa fa-expand'
  };

  var panzoom = function( params, cytoscape, $ ){
    var cyRef = this;
    var options = $.extend(true, {}, defaults, params);
    var fn = params;

    var functions = {
      destroy: function(){
        var $this = $(cyRef.container());
        var $pz = $this.find(".cy-panzoom");

        $pz.data('winbdgs').forEach(function( l ){
          $(window).unbind( l.evt, l.fn );
        });

        $pz.data('cybdgs').forEach(function( l ){
          cyRef.off( l.evt, l.fn );
        });

        $pz.remove();
      },

      init: function(){
        var browserIsMobile = 'ontouchstart' in window;

        return $(cyRef.container()).each(function(){
          var $container = $(this);
          $container.cytoscape = cytoscape;

          var winbdgs = [];
          var $win = $(window);

          var windowBind = function( evt, fn ){
            winbdgs.push({ evt: evt, fn: fn });

            $win.bind( evt, fn );
          };

          var windowUnbind = function( evt, fn ){
            for( var i = 0; i < winbdgs.length; i++ ){
              var l = winbdgs[i];

              if( l.evt === evt && l.fn === fn ){
                winbdgs.splice( i, 1 );
                break;
              }
            }

            $win.unbind( evt, fn );
          };

          var cybdgs = [];

          var cyOn = function( evt, fn ){
            cybdgs.push({ evt: evt, fn: fn });

            cyRef.on( evt, fn );
          };

          var cyOff = function( evt, fn ){
            for( var i = 0; i < cybdgs.length; i++ ){
              var l = cybdgs[i];

              if( l.evt === evt && l.fn === fn ){
                cybdgs.splice( i, 1 );
                break;
              }
            }

            cyRef.off( evt, fn );
          };

          var $panzoom = $('<div class="cy-panzoom"></div>');
          $container.prepend( $panzoom );

          $panzoom.css('position', 'absolute'); // must be absolute regardless of stylesheet

          $panzoom.data('winbdgs', winbdgs);
          $panzoom.data('cybdgs', cybdgs);

          if( options.zoomOnly ){
            $panzoom.addClass("cy-panzoom-zoom-only");
          }

          // add base html elements
          /////////////////////////

          var $zoomIn = $('<div class="cy-panzoom-zoom-in cy-panzoom-zoom-button"><span class="icon '+ options.zoomInIcon +'"></span></div>');
          $panzoom.append( $zoomIn );

          var $zoomOut = $('<div class="cy-panzoom-zoom-out cy-panzoom-zoom-button"><span class="icon ' + options.zoomOutIcon + '"></span></div>');
          $panzoom.append( $zoomOut );

          var $reset = $('<div class="cy-panzoom-reset cy-panzoom-zoom-button"><span class="icon ' + options.resetIcon + '"></span></div>');
          $panzoom.append( $reset );

          var $slider = $('<div class="cy-panzoom-slider"></div>');
          $panzoom.append( $slider );

          $slider.append('<div class="cy-panzoom-slider-background"></div>');

          var $sliderHandle = $('<div class="cy-panzoom-slider-handle"><span class="icon ' + options.sliderHandleIcon + '"></span></div>');
          $slider.append( $sliderHandle );

          var $noZoomTick = $('<div class="cy-panzoom-no-zoom-tick"></div>');
          $slider.append( $noZoomTick );

          var $panner = $('<div class="cy-panzoom-panner"></div>');
          $panzoom.append( $panner );

          var $pHandle = $('<div class="cy-panzoom-panner-handle"></div>');
          $panner.append( $pHandle );

          var $pUp = $('<div class="cy-panzoom-pan-up cy-panzoom-pan-button"></div>');
          var $pDown = $('<div class="cy-panzoom-pan-down cy-panzoom-pan-button"></div>');
          var $pLeft = $('<div class="cy-panzoom-pan-left cy-panzoom-pan-button"></div>');
          var $pRight = $('<div class="cy-panzoom-pan-right cy-panzoom-pan-button"></div>');
          $panner.append( $pUp ).append( $pDown ).append( $pLeft ).append( $pRight );

          var $pIndicator = $('<div class="cy-panzoom-pan-indicator"></div>');
          $panner.append( $pIndicator );

          // functions for calculating panning
          ////////////////////////////////////

          function handle2pan(e){
            var v = {
              x: e.originalEvent.pageX - $panner.offset().left - $panner.width()/2,
              y: e.originalEvent.pageY - $panner.offset().top - $panner.height()/2
            }

            var r = options.panDragAreaSize;
            var d = Math.sqrt( v.x*v.x + v.y*v.y );
            var percent = Math.min( d/r, 1 );

            if( d < options.panInactiveArea ){
              return {
                x: NaN,
                y: NaN
              };
            }

            v = {
              x: v.x/d,
              y: v.y/d
            };

            percent = Math.max( options.panMinPercentSpeed, percent );

            var vnorm = {
              x: -1 * v.x * (percent * options.panDistance),
              y: -1 * v.y * (percent * options.panDistance)
            };

            return vnorm;
          }

          function donePanning(){
            clearInterval(panInterval);
            windowUnbind("mousemove", handler);

            $pIndicator.hide();
          }

          function positionIndicator(pan){
            var v = pan;
            var d = Math.sqrt( v.x*v.x + v.y*v.y );
            var vnorm = {
              x: -1 * v.x/d,
              y: -1 * v.y/d
            };

            var w = $panner.width();
            var h = $panner.height();
            var percent = d/options.panDistance;
            var opacity = Math.max( options.panIndicatorMinOpacity, percent );
            var color = 255 - Math.round( opacity * 255 );

            $pIndicator.show().css({
              left: w/2 * vnorm.x + w/2,
              top: h/2 * vnorm.y + h/2,
              background: "rgb(" + color + ", " + color + ", " + color + ")"
            });
          }

          function calculateZoomCenterPoint(){
            var pan = cyRef.pan();
            var zoom = cyRef.zoom();

            zx = $container.width()/2;
            zy = $container.height()/2;
          }

          var zooming = false;
          function startZooming(){
            zooming = true;

            calculateZoomCenterPoint();
          }


          function endZooming(){
            zooming = false;
          }

          var zx, zy;
          function zoomTo(level){
            if( !zooming ){ // for non-continuous zooming (e.g. click slider at pt)
              calculateZoomCenterPoint();
            }

            cyRef.zoom({
              level: level,
              renderedPosition: { x: zx, y: zy }
            });
          }

          var panInterval;

          var handler = function(e){
            e.stopPropagation(); // don't trigger dragging of panzoom
            e.preventDefault(); // don't cause text selection
            clearInterval(panInterval);

            var pan = handle2pan(e);

            if( isNaN(pan.x) || isNaN(pan.y) ){
              $pIndicator.hide();
              return;
            }

            positionIndicator(pan);
            panInterval = setInterval(function(){
              cyRef.panBy(pan);
            }, options.panSpeed);
          };

          $pHandle.bind("mousedown", function(e){
            // handle click of icon
            handler(e);

            // update on mousemove
            windowBind("mousemove", handler);
          });

          $pHandle.bind("mouseup", function(){
            donePanning();
          });

          windowBind("mouseup blur", function(){
            donePanning();
          });



          // set up slider behaviour
          //////////////////////////

          $slider.bind('mousedown', function(){
            return false; // so we don't pan close to the slider handle
          });

          var sliderVal;
          var sliding = false;
          var sliderPadding = 2;

          function setSliderFromMouse(evt, handleOffset){
            if( handleOffset === undefined ){
              handleOffset = 0;
            }

            var padding = sliderPadding;
            var min = 0 + padding;
            var max = $slider.height() - $sliderHandle.height() - 2*padding;
            var top = evt.pageY - $slider.offset().top - handleOffset;

            // constrain to slider bounds
            if( top < min ){ top = min }
            if( top > max ){ top = max }

            var percent = 1 - (top - min) / ( max - min );

            // move the handle
            $sliderHandle.css('top', top);

            var zmin = options.minZoom;
            var zmax = options.maxZoom;

            // assume (zoom = zmax ^ p) where p ranges on (x, 1) with x negative
            var x = Math.log(zmin) / Math.log(zmax);
            var p = (1 - x)*percent + x;

            // change the zoom level
            var z = Math.pow( zmax, p );

            // bound the zoom value in case of floating pt rounding error
            if( z < zmin ){
              z = zmin;
            } else if( z > zmax ){
              z = zmax;
            }

            zoomTo( z );
          }

          var sliderMdownHandler, sliderMmoveHandler;
          $sliderHandle.bind('mousedown', sliderMdownHandler = function( mdEvt ){
            var handleOffset = mdEvt.target === $sliderHandle[0] ? mdEvt.offsetY : 0;
            sliding = true;

            startZooming();
            $sliderHandle.addClass("active");

            var lastMove = 0;
            windowBind('mousemove', sliderMmoveHandler = function( mmEvt ){
              var now = +new Date;

              // throttle the zooms every 10 ms so we don't call zoom too often and cause lag
              if( now > lastMove + 10 ){
                lastMove = now;
              } else {
                return false;
              }

              setSliderFromMouse(mmEvt, handleOffset);

              return false;
            });

            // unbind when
            windowBind('mouseup', function(){
              windowUnbind('mousemove', sliderMmoveHandler);
              sliding = false;

              $sliderHandle.removeClass("active");
              endZooming();
            });

            return false;
          });

          $slider.bind('mousedown', function(e){
            if( e.target !== $sliderHandle[0] ){
              sliderMdownHandler(e);
              setSliderFromMouse(e);
            }
          });

          function positionSliderFromZoom(){
            var z = cyRef.zoom();
            var zmin = options.minZoom;
            var zmax = options.maxZoom;

            // assume (zoom = zmax ^ p) where p ranges on (x, 1) with x negative
            var x = Math.log(zmin) / Math.log(zmax);
            var p = Math.log(z) / Math.log(zmax);
            var percent = 1 - (p - x) / (1 - x); // the 1- bit at the front b/c up is in the -ve y direction

            var min = sliderPadding;
            var max = $slider.height() - $sliderHandle.height() - 2*sliderPadding;
            var top = percent * ( max - min );

            // constrain to slider bounds
            if( top < min ){ top = min }
            if( top > max ){ top = max }

            // move the handle
            $sliderHandle.css('top', top);
          }

          positionSliderFromZoom();

          cyOn('zoom', function(){
            if( !sliding ){
              positionSliderFromZoom();
            }
          });

          // set the position of the zoom=1 tick
          (function(){
            var z = 1;
            var zmin = options.minZoom;
            var zmax = options.maxZoom;

            // assume (zoom = zmax ^ p) where p ranges on (x, 1) with x negative
            var x = Math.log(zmin) / Math.log(zmax);
            var p = Math.log(z) / Math.log(zmax);
            var percent = 1 - (p - x) / (1 - x); // the 1- bit at the front b/c up is in the -ve y direction

            if( percent > 1 || percent < 0 ){
              $noZoomTick.hide();
              return;
            }

            var min = sliderPadding;
            var max = $slider.height() - $sliderHandle.height() - 2*sliderPadding;
            var top = percent * ( max - min );

            // constrain to slider bounds
            if( top < min ){ top = min }
            if( top > max ){ top = max }

            $noZoomTick.css('top', top);
          })();

          // set up zoom in/out buttons
          /////////////////////////////

          function bindButton($button, factor){
            var zoomInterval;

            $button.bind("mousedown", function(e){
              e.preventDefault();
              e.stopPropagation();

              if( e.button != 0 ){
                return;
              }

              var doZoom = function(){
                var zoom = cyRef.zoom();
                var lvl = cyRef.zoom() * factor;

                if( lvl < options.minZoom ){
                  lvl = options.minZoom;
                }

                if( lvl > options.maxZoom ){
                  lvl = options.maxZoom;
                }

                if( (lvl == options.maxZoom && zoom == options.maxZoom) ||
                  (lvl == options.minZoom && zoom == options.minZoom)
                ){
                  return;
                }

                zoomTo(lvl);
              };

              startZooming();
              doZoom();
              zoomInterval = setInterval(doZoom, options.zoomDelay);

              return false;
            });

            windowBind("mouseup blur", function(){
              clearInterval(zoomInterval);
              endZooming();
            });
          }

          bindButton( $zoomIn, (1 + options.zoomFactor) );
          bindButton( $zoomOut, (1 - options.zoomFactor) );

          $reset.bind("mousedown", function(e){
            if( e.button != 0 ){
              return;
            }

            var elesToFit = options.fitSelector?cyRef.elements(options.fitSelector):cyRef.elements();

            if( elesToFit.size() === 0 ){
              cyRef.reset();
            } else {
              var animateOnFit = typeof options.animateOnFit === 'function' ? options.animateOnFit.call() : options.animateOnFit;
              if(animateOnFit){
                cyRef.animate({
                  fit: {
                    eles: elesToFit,
                    padding: options.fitPadding
                  }
                }, {
                  duration: options.fitAnimationDuration
                });
              }
              else{
                cyRef.fit( elesToFit, options.fitPadding );
              }

            }

            return false;
          });



        });
      }
    };

    if( functions[fn] ){
      return functions[fn].apply(this, Array.prototype.slice.call( arguments, 1 ));
    } else if( typeof fn == 'object' || !fn ) {
      return functions.init.apply( this, arguments );
    } else {
      $.error("No such function `"+ fn +"` for jquery.cytoscapePanzoom");
    }

    return $(this);
  };


  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = function( cytoscape, jquery ){
      register( cytoscape, jquery || require('jquery') );
    }
  } else if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-panzoom', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' && typeof jQuery !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape, jQuery );
  }

})();

/* ---------------------- PANZOOM EXTENSION END --------------------------*/




















/* ------------------------ DAGRE LAYOUT EXTENSION ----------------------*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("dagre"));
	else if(typeof define === 'function' && define.amd)
		define(["dagre"], factory);
	else if(typeof exports === 'object')
		exports["cytoscapeDagre"] = factory(require("dagre"));
	else
		root["cytoscapeDagre"] = factory(root["dagre"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__4__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

var impl = __webpack_require__(1); // registers the extension on a cytoscape lib ref


var register = function register(cytoscape) {
  if (!cytoscape) {
    return;
  } // can't register if cytoscape unspecified


  cytoscape('layout', 'dagre', impl); // register with cytoscape.js
};

if (typeof cytoscape !== 'undefined') {
  // expose to global cytoscape (i.e. window.cytoscape)
  register(cytoscape);
}

module.exports = register;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var isFunction = function isFunction(o) {
  return typeof o === 'function';
};

var defaults = __webpack_require__(2);

var assign = __webpack_require__(3);

var dagre = __webpack_require__(4); // constructor
// options : object containing layout options


function DagreLayout(options) {
  this.options = assign({}, defaults, options);
} // runs the layout


DagreLayout.prototype.run = function () {
  var options = this.options;
  var layout = this;
  var cy = options.cy; // cy is automatically populated for us in the constructor

  var eles = options.eles;

  var getVal = function getVal(ele, val) {
    return isFunction(val) ? val.apply(ele, [ele]) : val;
  };

  var bb = options.boundingBox || {
    x1: 0,
    y1: 0,
    w: cy.width(),
    h: cy.height()
  };

  if (bb.x2 === undefined) {
    bb.x2 = bb.x1 + bb.w;
  }

  if (bb.w === undefined) {
    bb.w = bb.x2 - bb.x1;
  }

  if (bb.y2 === undefined) {
    bb.y2 = bb.y1 + bb.h;
  }

  if (bb.h === undefined) {
    bb.h = bb.y2 - bb.y1;
  }

  var g = new dagre.graphlib.Graph({
    multigraph: true,
    compound: true
  });
  var gObj = {};

  var setGObj = function setGObj(name, val) {
    if (val != null) {
      gObj[name] = val;
    }
  };

  setGObj('nodesep', options.nodeSep);
  setGObj('edgesep', options.edgeSep);
  setGObj('ranksep', options.rankSep);
  setGObj('rankdir', options.rankDir);
  setGObj('align', options.align);
  setGObj('ranker', options.ranker);
  setGObj('acyclicer', options.acyclicer);
  g.setGraph(gObj);
  g.setDefaultEdgeLabel(function () {
    return {};
  });
  g.setDefaultNodeLabel(function () {
    return {};
  }); // add nodes to dagre

  var nodes = eles.nodes();

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var nbb = node.layoutDimensions(options);
    g.setNode(node.id(), {
      width: nbb.w,
      height: nbb.h,
      name: node.id()
    }); // console.log( g.node(node.id()) );
  } // set compound parents


  for (var _i = 0; _i < nodes.length; _i++) {
    var _node = nodes[_i];

    if (_node.isChild()) {
      g.setParent(_node.id(), _node.parent().id());
    }
  } // add edges to dagre


  var edges = eles.edges().stdFilter(function (edge) {
    return !edge.source().isParent() && !edge.target().isParent(); // dagre can't handle edges on compound nodes
  });

  for (var _i2 = 0; _i2 < edges.length; _i2++) {
    var edge = edges[_i2];
    g.setEdge(edge.source().id(), edge.target().id(), {
      minlen: getVal(edge, options.minLen),
      weight: getVal(edge, options.edgeWeight),
      name: edge.id()
    }, edge.id()); // console.log( g.edge(edge.source().id(), edge.target().id(), edge.id()) );
  }

  dagre.layout(g);
  var gNodeIds = g.nodes();

  for (var _i3 = 0; _i3 < gNodeIds.length; _i3++) {
    var id = gNodeIds[_i3];
    var n = g.node(id);
    cy.getElementById(id).scratch().dagre = n;
  }

  var dagreBB;

  if (options.boundingBox) {
    dagreBB = {
      x1: Infinity,
      x2: -Infinity,
      y1: Infinity,
      y2: -Infinity
    };
    nodes.forEach(function (node) {
      var dModel = node.scratch().dagre;
      dagreBB.x1 = Math.min(dagreBB.x1, dModel.x);
      dagreBB.x2 = Math.max(dagreBB.x2, dModel.x);
      dagreBB.y1 = Math.min(dagreBB.y1, dModel.y);
      dagreBB.y2 = Math.max(dagreBB.y2, dModel.y);
    });
    dagreBB.w = dagreBB.x2 - dagreBB.x1;
    dagreBB.h = dagreBB.y2 - dagreBB.y1;
  } else {
    dagreBB = bb;
  }

  var constrainPos = function constrainPos(p) {
    if (options.boundingBox) {
      var xPct = dagreBB.w === 0 ? 0 : (p.x - dagreBB.x1) / dagreBB.w;
      var yPct = dagreBB.h === 0 ? 0 : (p.y - dagreBB.y1) / dagreBB.h;
      return {
        x: bb.x1 + xPct * bb.w,
        y: bb.y1 + yPct * bb.h
      };
    } else {
      return p;
    }
  };

  nodes.layoutPositions(layout, options, function (ele) {
    ele = _typeof(ele) === "object" ? ele : this;
    var dModel = ele.scratch().dagre;
    return constrainPos({
      x: dModel.x,
      y: dModel.y
    });
  });
  return this; // chaining
};

module.exports = DagreLayout;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

var defaults = {
  // dagre algo options, uses default value on undefined
  nodeSep: undefined,
  // the separation between adjacent nodes in the same rank
  edgeSep: undefined,
  // the separation between adjacent edges in the same rank
  rankSep: undefined,
  // the separation between adjacent nodes in the same rank
  rankDir: undefined,
  // alignment for rank nodes. Can be 'UL', 'UR', 'DL', or 'DR', where U = up, D = down, L = left, and R = right
  align: undefined,
  // 'TB' for top to bottom flow, 'LR' for left to right,
  ranker: undefined,
  // Type of algorithm to assigns a rank to each node in the input graph.
  // Possible values: network-simplex, tight-tree or longest-path
  minLen: function minLen(edge) {
    return 1;
  },
  // number of ranks to keep between the source and target of the edge
  edgeWeight: function edgeWeight(edge) {
    return 1;
  },
  // higher weight edges are generally made shorter and straighter than lower weight edges
  // general layout options
  fit: true,
  // whether to fit to viewport
  padding: 30,
  // fit padding
  spacingFactor: undefined,
  // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
  nodeDimensionsIncludeLabels: true,
  // whether labels should be included in determining the space used by a node
  animate: true,
  // whether to transition the node positions
  animateFilter: function animateFilter(node, i) {
    return true;
  },
  // whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
  animationDuration: 500,
  // duration of animation in ms if enabled
  animationEasing: undefined,
  // easing of animation if enabled
  boundingBox: undefined,
  // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  transform: function transform(node, pos) {
    return pos;
  },
  // a function that applies a transform to the final node position
  ready: function ready() {},
  // on layoutready
  stop: function stop() {} // on layoutstop

};
module.exports = defaults;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

// Simple, internal Object.assign() polyfill for options objects etc.
module.exports = Object.assign != null ? Object.assign.bind(Object) : function (tgt) {
  for (var _len = arguments.length, srcs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    srcs[_key - 1] = arguments[_key];
  }

  srcs.forEach(function (src) {
    Object.keys(src).forEach(function (k) {
      return tgt[k] = src[k];
    });
  });
  return tgt;
};

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__4__;

/***/ })
/******/ ]);
});
