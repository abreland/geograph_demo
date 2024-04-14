/* eslint-disable */

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
import cytoscape from "cytoscape";
import graph from "./sample.json5";
import {colorMap, hexToRgb} from "./colorMap";

let current_graph = JSON.parse(JSON.stringify(graph));
let cy;
let layout;
const coords = {};


updateCY();

function updateCY() {
    cy = cytoscape({...current_graph, container: document.getElementById("cy")});
    layout = cy.layout({
        name: "cose", avoidOverlap: true,
        nodeDimensionsIncludeLabels: true
    });
    layout.run();
    updateMatrix({})
}

const viewer = new Viewer("cesiumContainer", {
    terrain: Terrain.fromWorldTerrain({
        requestVertexNormals:true
    }),
    fullscreenButton: false,
    animation: false,
    timeline: false,
    infoBox: false,
    homeButton: true,
    selectionIndicator: false,
    orderIndependentTranslucency: false,
});
viewer._cesiumWidget._creditContainer.style.display = "none"
const scene = viewer.scene;
scene.requestRenderMode = true;
scene.nearToFarDistance2D = 1.75e3

scene.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const mousePosition = new Cartesian2(event.clientX, event.clientY);
    const selectedLocation = convertScreenPixelToLocation(mousePosition);
}, false);

const convertScreenPixelToLocation = (mousePosition) => {
    const ellipsoid = viewer.scene.globe.ellipsoid;
    const cartesian = viewer.camera.pickEllipsoid(mousePosition, ellipsoid);
    if (cartesian) {
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const longitudeString = CeiumMath.toDegrees(cartographic.longitude).toFixed(15);
        const latitudeString = CeiumMath.toDegrees(cartographic.latitude).toFixed(15);
        return {lat: Number(latitudeString), lng: Number(longitudeString)};
    } else {
        return null;
    }
}

const renderGraph = () => {
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
                pixelSize: 10,
                color: mappedColor ? mappedColor : Color.BLUE,
                heightReference : HeightReference.RELATIVE_TO_GROUND
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
    scene.requestRender();
};

const groupBy=(type = null) => {
    updateMatrix({})
    if (type !== "select") {
        const curr_nodes = current_graph["elements"].filter((n) => {
            return n["data"]["type"] === "node";
        });
        const curr_edges = current_graph["elements"].filter((n) => {
            return n["data"]["type"] === "edge";
        });
        const new_nodes = {};
        const node_ids = {};
        const legend = new Set([]);
        const matrix = {}
        curr_nodes.forEach((node, index) => {
            const grouptype = node["data"][type];
            const nodeid = node["data"]["id"];
            const num_edges = node["data"]["edges"];
            legend.add(node["data"][type]);
            matrix[node["data"][type]] = {}
            const type_list = Object.keys(matrix)
            for (const t of type_list) {
                matrix[t] = {}
                for (const t1 of type_list) {
                    matrix[t][t1] = 0
                }
            }

            if (!Object.keys(new_nodes).includes(grouptype)) {
                new_nodes[grouptype] = {count: 0, id: index, latitudes: [], longitudes: [], edges: 0};
            }
            new_nodes[grouptype].count += 1;
            new_nodes[grouptype].latitudes.push(node["data"]["latitude"]);
            new_nodes[grouptype].longitudes.push(node["data"]["longitude"]);
            new_nodes[grouptype].edges += num_edges;
            node_ids[nodeid] = grouptype;
        });

        const new_edges = {};
        curr_edges.forEach((node, index) => {
            const source = node["data"]["source"];
            const target = node["data"]["target"];
            const source_label = node_ids[source];
            const target_label = node_ids[target];
            const label_list = [source_label, target_label].sort();
            const id = label_list.join("_");

            if (!Object.keys(new_edges).includes(id)) {
                new_edges[id] = {count: 0, source: "", target: ""};
            }
            new_edges[id].count += 1;
            new_edges[id].source = label_list[0];
            new_edges[id].target = label_list[1];
        });

        const elements = [];
        const styles = [];
        for (const [key, value] of Object.entries(new_nodes)) {
            let new_latitude = value["latitudes"];
            let new_longitude = value["longitudes"];
            new_latitude = new_latitude.reduce((a, b) => a + b, 0) / new_latitude.length;
            new_longitude = new_longitude.reduce((a, b) => a + b, 0) / new_longitude.length;
            const rgb = hexToRgb(colorMap[key]);
            const obj = {
                "data": {
                    "id": key,
                    "longitude": new_longitude,
                    "latitude": new_latitude,
                    "type": "node",
                    "key": key,
                    "num": new_nodes[key].count,
                    "color": hexToRgb(colorMap[key])
                }
            };
            elements.push(obj);
            const style = {
                "selector": "node[key= \"" + key + "\"]",
                "style": {
                    "background-color": colorMap[key],
                    "width": "40px",
                    "height": "40px",
                    "content": "data(key)",
                    'text-valign': 'center',
                    'text-halign': 'center',
                }
            };
            styles.push(style);
        }

        let total_edges = 0
        for (const [key, value] of Object.entries(new_edges)) {
            total_edges += value.count
        }
        for (const [key, value] of Object.entries(new_edges)) {
            matrix[value.source][value.target] = value.count
            const percent = (value.count / total_edges).toPrecision(2)
            const obj = {
                "data": {
                    "id": key,
                    "pair": key,
                    "source": value.source,
                    "target": value.target,
                    "type": "edge",
                    "count": value.count,
                    "width": value.count,
                    "percent": percent
                }
            };
            elements.push(obj);
            const style = {
                "selector": "edge",
                "style": {
                    "width": "10px",
                    "line-color": "#bbbbbb",
                    "curve-style": "bezier",
                    "label": "data(count)",
                }
            };
            styles.push(style);
        }

        current_graph = {"elements": elements, "style": styles};
        updateCY(current_graph);
        updateLegend(legend);
        calcMixing(matrix)
    }
}

function colorBy(type = null) {
    updateMatrix({})
    if (type !== "select") {
        const curr_nodes = graph["elements"].filter((n) => {
            return n["data"]["type"] === "node";
        });
        const curr_edges = graph["elements"].filter((n) => {
            return n["data"]["type"] === "edge";
        });
        const elements = [];
        const styles = [];
        const legend = new Set([]);
        curr_nodes.forEach((node, index) => {
            const hexColor = colorMap[node["data"][type]];
            const rgbColor = hexToRgb(hexColor);
            legend.add(node["data"][type]);
            const id = node["data"]["id"];

            const new_node = {...node};
            new_node["data"]["color"] = {...rgbColor};
            const new_style = {
                "selector": "node[id= \"" + id + "\"]",
                "style": {
                    "background-color": hexColor,
                    "label": "data(key)",
                    "width": "60px",
                    "height": "60px",
                    "content": "data(id)"
                }
            };
            elements.push(new_node);
            styles.push(new_style);
        });

        curr_edges.forEach((edge, index) => {
            elements.push({...edge});
        });

        current_graph = {"elements": elements, "style": styles};
        updateCY();
        updateLegend(legend);
    }
}

function filterBy(filter = null) {
    updateMatrix({})

    if (filter !== "select") {
        current_graph = JSON.parse(JSON.stringify(graph));
        let filtered_nodes = [];
        if (filter === "edges3") {
            filtered_nodes = current_graph["elements"].filter((n) => {
                return n["data"]["edges"] > 2;
            });
        } else if (filter === "water5") {
            filtered_nodes = current_graph["elements"].filter((n) => {
                return n["data"]["dist_water"] <= 5;
            });
        } else if (filter === "road5") {
            filtered_nodes = current_graph["elements"].filter((n) => {
                return n["data"]["dist_interstate"] <= 5;
            });
        } else if (filter === "urban") {
            filtered_nodes = current_graph["elements"].filter((n) => {
                return n["data"]["vegetation"] == "urban";
            });
        } else if (filter === "nonurban") {
            filtered_nodes = current_graph["elements"].filter((n) => {
                return n["data"]["type"] == "node" && n["data"]["vegetation"] != "urban";
            });
        }
        const ids = filtered_nodes.map((node) => node["data"]["id"]);
        let filtered_edges = current_graph["elements"].filter((n) => {
            return ids.includes(n["data"]["source"]) && ids.includes(n["data"]["target"]);
        });
        current_graph["elements"] = filtered_nodes.concat(filtered_edges);
        updateCY();
    }
}




const revertBtn = document.getElementById("revert");
revertBtn.onclick = () => {
    current_graph = JSON.parse(JSON.stringify(graph));
    updateCY();
    updateLegend({});
    updateMatrix({})
};

function calcMixing(matrix) {
    const types = Object.keys(matrix)
    let total = 0

    for (const k of types) {
        for (const j of types) {
            total += matrix[k][j]
        }
    }

    for (const k of types) {
        for (const j of types) {
            matrix[k][j] = matrix[k][j] / total
        }
    }

    for (const k of types) {
        let sum = 0
        for (const j of types) {
            sum += matrix[k][j]
        }
        for (const j of types) {
            matrix[k][j] = (matrix[k][j] / sum).toPrecision(4)
        }
    }

    updateMatrix(matrix)
}


function updateMatrix(matrix) {
    const types = Object.keys(matrix);
    if (types.length > 0) {

        const text11 = document.getElementById("11");
        text11.innerHTML = "P(" + types[0] + "|" + types[0] + ")=" + matrix[types[0]][types[0]]
        const text12 = document.getElementById("12");
        text12.innerHTML = "P(" + types[1] + "|" + types[1] + ")=" + matrix[types[0]][types[1]]
        const text13 = document.getElementById("13");
        text13.innerHTML = "P(" + types[2] + "|" + types[2] + ")=" + matrix[types[0]][types[2]]
        const text14 = document.getElementById("14");
        text14.innerHTML = "P(" + types[3] + "|" + types[3] + ")=" + matrix[types[0]][types[3]]

        const text21 = document.getElementById("21");
        text21.innerHTML = "P(" + types[0] + "|" + types[1] + ")=" + matrix[types[1]][types[0]]
        const text22 = document.getElementById("22");
        text22.innerHTML = "P(" + types[1] + "|" + types[1] + ")=" + matrix[types[1]][types[1]]
        const text23 = document.getElementById("23");
        text23.innerHTML = "P(" + types[2] + "|" + types[1] + ")=" + matrix[types[1]][types[2]]
        const text24 = document.getElementById("24");
        text24.innerHTML = "P(" + types[3] + "|" + types[1] + ")=" + matrix[types[1]][types[3]]

        const text31 = document.getElementById("31");
        text31.innerHTML = "P(" + types[0] + "|" + types[2] + ")=" + matrix[types[2]][types[0]]
        const text32 = document.getElementById("32");
        text32.innerHTML = "P(" + types[1] + "|" + types[2] + ")=" + matrix[types[2]][types[1]]
        const text33 = document.getElementById("33");
        text33.innerHTML = "P(" + types[2] + "|" + types[2] + ")=" + matrix[types[2]][types[2]]
        const text34 = document.getElementById("34");
        text34.innerHTML = "P(" + types[3] + "|" + types[2] + ")=" + matrix[types[2]][types[3]]

        const text41 = document.getElementById("41");
        text11.innerHTML = "P(" + types[0] + "|" + types[3] + ")=" + matrix[types[3]][types[0]]

        const text42 = document.getElementById("42");
        text12.innerHTML = "P(" + types[1] + "|" + types[3] + ")=" + matrix[types[3]][types[1]]
        const text43 = document.getElementById("43");
        text13.innerHTML = "P(" + types[2] + "|" + types[3] + ")=" + matrix[types[3]][types[2]]
        const text44 = document.getElementById("44");
        text14.innerHTML = "P(" + types[3] + "|" + types[3] + ")=" + matrix[types[3]][types[3]]

    } else {
        const text11 = document.getElementById("11");
        text11.innerHTML = ""
        const text12 = document.getElementById("12");
        text12.innerHTML = ""
        const text13 = document.getElementById("13");
        text13.innerHTML = ""
        const text14 = document.getElementById("14");
        text14.innerHTML = ""

        const text21 = document.getElementById("21");
        text21.innerHTML = ""
        const text22 = document.getElementById("22");
        text22.innerHTML = ""
        const text23 = document.getElementById("23");
        text23.innerHTML = ""
        const text24 = document.getElementById("24");
        text24.innerHTML = ""

        const text31 = document.getElementById("31");
        text31.innerHTML = ""
        const text32 = document.getElementById("32");
        text32.innerHTML = ""
        const text33 = document.getElementById("33");
        text33.innerHTML = ""
        const text34 = document.getElementById("34");
        text34.innerHTML = ""

        const text41 = document.getElementById("41");
        text11.innerHTML = ""

        const text42 = document.getElementById("42");
        text12.innerHTML = ""
        const text43 = document.getElementById("43");
        text13.innerHTML = ""
        const text44 = document.getElementById("44");
        text14.innerHTML = ""
    }
}

function updateLegend(legend) {

    const legendlist = Array.from(legend);

    if (legendlist.length > 0) {

        const color1 = document.getElementById("legend1color");
        color1.setAttribute("style", "background-color:" + colorMap[legendlist[0]] + "; width:75px; height:20px ;margin:2px");
        const text1 = document.getElementById("legend1text");
        text1.innerHTML = legendlist[0];

        const color2 = document.getElementById("legend2color");
        color2.setAttribute("style", "background-color:" + colorMap[legendlist[1]] + "; width:75px; height:20px;margin:2p");
        const text2 = document.getElementById("legend2text");
        text2.innerHTML = legendlist[1];

        const color3 = document.getElementById("legend3color");
        color3.setAttribute("style", "background-color:" + colorMap[legendlist[2]] + "; width:75px; height:20px;margin:2p");
        const text3 = document.getElementById("legend3text");
        text3.innerHTML = legendlist[2];

        const color4 = document.getElementById("legend4color");
        color4.setAttribute("style", "background-color:" + colorMap[legendlist[3]] + "; width:75px; height:20px;margin:2p");
        const text4 = document.getElementById("legend4text");
        text4.innerHTML = legendlist[3];
    } else {
        const color1 = document.getElementById("legend1color");
        color1.setAttribute("style", " width:0px");
        const text1 = document.getElementById("legend1text");
        text1.innerHTML = "";

        const color2 = document.getElementById("legend2color");
        color2.setAttribute("style", " width:0px");
        const text2 = document.getElementById("legend2text");
        text2.innerHTML = "";

        const color3 = document.getElementById("legend3color");
        color3.setAttribute("style", " width:0px");
        const text3 = document.getElementById("legend3text");
        text3.innerHTML = "";

        const color4 = document.getElementById("legend4color");
        color4.setAttribute("style", " width:0px");
        const text4 = document.getElementById("legend4text");
        text4.innerHTML = "";

    }
}

const clearBtn = document.getElementById("clearGlobe");
clearBtn.onclick = () => {
    viewer.entities.removeAll();
    scene.requestRender();

};

const selectBtn = document.getElementById("groupselect");
selectBtn.onchange = (e) => {
    const {selectedIndex} = e.target;
    const type = e.target.options[selectedIndex].value;
    groupBy(type);
};

const colorBtn = document.getElementById("colorselect");
colorBtn.onchange = (e) => {
    const {selectedIndex} = e.target;
    const type = e.target.options[selectedIndex].value;
    colorBy(type);
};

// const filterBtn = document.getElementById("filterselect");
// filterBtn.onchange = (e) => {
//     const {selectedIndex} = e.target;
//     const value = e.target.options[selectedIndex].value;
//     filterBy(value);
// };


const addBtn = document.getElementById("addToGlobe");
addBtn.onclick = renderGraph





