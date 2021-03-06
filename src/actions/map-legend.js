import {loadModules} from 'esri-loader';

export const SET_CURRENT_SCALE = 'map-legend/SET_CURRENT_SCALE';
export const TOGGLE_LEGEND_NODE_VISIBLE = 'map-legend/TOGGLE_LEGEND_NODE_VISIBLE';
export const RESET_LEGEND_IS_FETCHING = 'map-legend/RESET_LEGEND_IS_FETCHING';
export const REQUEST_LEGEND_DATA = 'map-legend/REQUEST_LEGEND_DATA';
export const RECEIVE_LEGEND_DATA = 'map-legend/RECEIVE_LEGEND_DATA';
export const TOGGLE_LEGEND_NODE_EXPANDED = 'map-legend/TOGGLE_LEGEND_NODE_EXPANDED';
export const SET_LEGEND_DOM_DATA = 'map-legend/SET_LEGEND_DOM_DATA';
export const TOGGLE_SHOW_SETTINGS = 'map-legend/TOGGLE_SHOW_SETTINGS';
export const REVERSE_LAYER_ORDER = 'map-legend/REVERSE_LAYER_ORDER';
export const SHOW_LAYERS_NOT_VISIBLE_FOR_SCALE = 'map-legend/SHOW_LAYERS_NOT_VISIBLE_FOR_SCALE';
export const INIT_MAP_OPTIONS = 'map-legend/INIT_MAP_OPTIONS';
export const SET_INITIAL_LEGEND_MAPIMAGELAYER_DATA =
  'map-legend/SET_INITIAL_LEGEND_MAPIMAGELAYER_DATA';
export const SET_INITIAL_LEGEND_GRAPHICSLAYER_DATA =
  'map-legend/SET_INITIAL_LEGEND_GRAPHICSLAYER_DATA';
export const TOGGLE_LEGEND_EXPANDED = 'map-legend/TOGGLE_LEGEND_EXPANDED';

export const toggleExpanded = (mapId, expanded) => {
  return {
    type: TOGGLE_LEGEND_EXPANDED,
    payload: { mapId, expanded }
  };
};

export const toggleNodeExpanded = (nodeId, mapId) => {
  return {
    type: TOGGLE_LEGEND_NODE_EXPANDED,
    payload: { nodeId, mapId }
  };
};

export const toggleNodeVisible = (nodeId, mapId) => {
  return {
    type: TOGGLE_LEGEND_NODE_VISIBLE,
    payload: { nodeId, mapId }
  };
};

export const toggleShowSettings = mapId => {
  return {
    type: TOGGLE_SHOW_SETTINGS,
    payload: { mapId }
  };
};

export const reverseLayerOrder = mapId => {
  return {
    type: REVERSE_LAYER_ORDER,
    payload: { mapId }
  };
};

export const showLayersNotVisibleForScale = (mapId, show) => {
  return {
    type: SHOW_LAYERS_NOT_VISIBLE_FOR_SCALE,
    payload: { mapId, show }
  };
};

export const fetchLegend = (url, mapId) => {
  return function(dispatch) {
    dispatch({
      type: REQUEST_LEGEND_DATA,
      payload: { url, mapId }
    });

    loadModules(['esri/request']).then(([esriRequest]) => {
      
      return esriRequest(`${url}/legend`, {
        query: { f: 'json' },
        responseType: 'json'
      }).then(
        response => {
          dispatch({
            type: RECEIVE_LEGEND_DATA,
            payload: { layers: response.data.layers, url, mapId }
          });
        },
        error => {
          console.error(error);
          dispatch({
            type: RESET_LEGEND_IS_FETCHING
          });
        }
      );
    });
  };
};

const hookLegend = (legend, callback) => {
  
  var original = legend._renderLegendForLayer;

  legend._renderLegendForLayer = (a) => {
    let result = original.call(legend, a);
    callback(result, legend);
    return result;
  };
};

const debounce = (func, wait, immediate) => {
  let timeout;
  return function() {
    let context = this, args = arguments;
    let later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

const dispatchScaleChange = debounce(function(dispatch, newScale, mapId) {
  dispatch({
    type: SET_CURRENT_SCALE,
    payload: { scale: newScale, mapId }
  });
}, 250);

const createLayerLegend = (view, mapId, layer, dispatch) => {
  loadModules(['esri/widgets/Legend', 'esri/core/watchUtils']).then(([Legend, watchUtils]) => {

    watchUtils.whenTrueOnce(layer, 'loaded', function () {

      hookLegend(
        new Legend({ view, layerInfos: [{ layer }], container: document.createElement('div') }), 
        (legendDOMForLayer, legend) => {
        setTimeout(() => {
          if (legendDOMForLayer && legendDOMForLayer.domNode && legendDOMForLayer.children && legendDOMForLayer.children.length > 0) {

            dispatch({
              type: SET_LEGEND_DOM_DATA,
              payload: { legendKey: legendDOMForLayer.properties.key, legendWidget: legendDOMForLayer.children.find(c => c.properties.class === 'esri-legend__layer').domNode, mapId }
            });  

            if (legend && legend.destroy && legend.destroyed === false) {
              legend.destroy();
            }            
          }                  
        }, 250);
      });
    });
  });
};

export const setInitialLegend = (view, mapId) => {
  return function(dispatch) {
    view.when(() => {
      dispatch({
        type: INIT_MAP_OPTIONS,
        payload: { mapId }
      });

      dispatchScaleChange(dispatch, view.scale, mapId);

      view.watch('scale', newScale => {
        dispatchScaleChange(dispatch, newScale, mapId);
      });

      for (var i = 0, iLen = view.map.layers.length; i < iLen; i++) {

        const lyr = view.map.layers.items[i];      
        lyr.__index = i + 1;        

        lyr.when((loadedLayer) => {
            if (
              loadedLayer.loaded &&
              loadedLayer.legendEnabled &&
              loadedLayer.type &&
              ['map-image'].indexOf(loadedLayer.type.toLowerCase()) > -1 &&
              loadedLayer.allSublayers
            ) {
              dispatch({
                type: SET_INITIAL_LEGEND_MAPIMAGELAYER_DATA,
                payload: { view, mapId, layer: loadedLayer }
              });
            }

            if (
              loadedLayer.loaded &&
              loadedLayer.legendEnabled &&
              loadedLayer.type &&
              ['csv', 'feature', 'graphics', 'scene', 'stream', 'point-cloud', 'map-notes'].indexOf(
                loadedLayer.type.toLowerCase()
              ) > -1 &&
              (lyr.url || lyr.source)
            ) {
              dispatch({
                type: SET_INITIAL_LEGEND_GRAPHICSLAYER_DATA,
                payload: { view, mapId, layer: loadedLayer }
              });

              createLayerLegend(view, mapId, loadedLayer, dispatch);
            }
          }
        ).otherwise(function(error) {
          console.error('Failed to load a layer for use with the legend control.', error)
        });
      }
    });
  };
};
