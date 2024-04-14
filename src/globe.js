import {
  Viewer,
  Cartesian2,
  Cartesian3,
  Color,
  Math as CeiumMath,
  Terrain,
  NearFarScalar, HeightReference, PolylineGlowMaterialProperty
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./css/main.css";
import "./scss/styles.scss";


export function convertScreenPixelToLocation(mousePosition) {
  const ellipsoid = Viewer.scene.globe.ellipsoid;
  const cartesian = Viewer.camera.pickEllipsoid(mousePosition, ellipsoid);
  if (cartesian) {
    const cartographic = ellipsoid.cartesianToCartographic(cartesian);
    const longitudeString = Math.toDegrees(cartographic.longitude).toFixed(15);
    const latitudeString = Math.toDegrees(cartographic.latitude).toFixed(15);
    return { lat: Number(latitudeString), lng: Number(longitudeString) };
  } else {
    return null;
  }
}

export function renderGraph(viewer, current_graph = {}, coords={}){
  viewer.entities.removeAll();
  const nodes = current_graph.elements.filter((el) => el.data.type == "node");
  const edges = current_graph.elements.filter((el) => el.data.type == "edge");
  nodes.forEach((node) => {
    const {latitude, longitude, id} = node.data;
    coords[id] = {longitude, latitude, height: 0};
    let mappedColor = null;
    if (!!node.data.color) {
      const {r, g, b} = node.data.color;
      mappedColor = new Color(r / 255.0, g / 255.0, b / 255.0);
    }

    viewer.entities.add({
      position: Cartesian3.fromDegrees(longitude, latitude, 200),
      point: {
        pixelSize: 5,
        color: mappedColor ? mappedColor : Color.BLUE,
        heightReference : HeightReference.RELATIVE_TO_GROUND,
        scaleByDistance: new NearFarScalar(0, 1, 500000, 3)
      }
    });
  });

  edges.forEach((edge) => {
    let {source, target, width} = edge.data;
    if (width === undefined)
      width = 2
    viewer.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArrayHeights([
          coords[source].longitude, coords[source].latitude, coords[source].height,
          coords[target].longitude, coords[target].latitude, coords[target].height
        ]),
        width: width,
        material: new PolylineGlowMaterialProperty(),
        clampToGround: true
      }
    });
  });
  viewer.scene.requestRender();
};