import React from "react";
import ReactDOM from "react-dom";
import {connect} from "react-redux";
import * as esriLoader from "esri-loader";
import {MapLegend, setInitialLegend} from "../../../src/";
import isWebGLEnabled from 'is-webgl-enabled';
import isMobile from 'is-mobile';

class MapUi extends React.Component {

  createMap = () => {

    const {mapId, initLegend} = this.props;
    
    esriLoader.dojoRequire(
        ["esri/Map", isWebGLEnabled() && !isMobile() ? "esri/views/SceneView" : "esri/views/MapView", "esri/layers/MapImageLayer"],
        (Map, View, MapImageLayer) => {
        // ["esri/Map", isWebGLEnabled() && !isMobile() ? "esri/views/SceneView" : "esri/views/MapView", "esri/WebMap"],
        // (Map, View, WebMap) => {

          const layer1 = new MapImageLayer({
            url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/RedlandsEmergencyVehicles/MapServer"
          });

          const layer2 = new MapImageLayer({
            url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer",
            visible: false
          });

          const layer3 = new MapImageLayer({
            url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Hurricanes/MapServer/'
          });

          const map = new Map({basemap: "topo", layers: [layer1, layer2, layer3]});

          // const view = new SceneView({
          //   container: ReactDOM.findDOMNode(this.refs.mapView),
          //   map: new WebMap({
          //     portalItem: {
          //       id: '8e42e164d4174da09f61fe0d3f206641'
          //     }
          //   }),
          //   padding: {right: 280}
          // });

          //view.map.layers.add(layer3);

          const view = new View({
            container: ReactDOM.findDOMNode(this.refs.mapView),
            map: map,
            padding: {right: 280}
          });

          // calling this initialises the legend control
          initLegend(view, mapId);

          layer3.then(function(lyr) {
            view.goTo(lyr.fullExtent);
          });  
        }
      );
  }

  componentDidMount() {  

    if (!esriLoader.isLoaded()) {
      // lazy load the ArcGIS API
      esriLoader.bootstrap(err => {
        if (err) {
          console.error(err);
          return;
        }

        this.createMap();
      });
    } else {
      this.createMap();
    }
  }

  render() {
    const {mapId} = this.props;

    return (
      <div style={{width: "100%", height: "100%"}} ref="mapView">
        <MapLegend style={{width: "30%", height: "100%"}} mapId={mapId} /> 
      </div>   
    );
  }
}

const mapDispatchToProps = dispatch => {
  return {
    initLegend: (view, mapId) => {
      dispatch(setInitialLegend(view, mapId));
    }
  };
};

export default connect(null, mapDispatchToProps)(MapUi);
