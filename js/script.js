// UI Actions

anchor_color_picker.on("change", changePointStrokeColor);

anchor_bgcolor_picker.on("change", changePointBgColor);

line_color_picker.on("change", changeLineColor);

function changePointStrokeColor( color ){
    if( points.length ){
        points.forEach( e => {
            e.attrs.stroke = "#" + color;
        })
    }
    anchor_color = "#" + color;
    layer.draw();
}

function changePointBgColor( color ){
    if( points.length ){
        points.forEach( e => {
            e.attrs.fill = "#" + color;
        })
    }   
    anchor_bgcolor = "#" + color;
    layer.draw();
}

function changeLineColor( color ){
    polylines.forEach( line => {
        line.attrs.stroke = "#" + color;
    })
    line_color = "#" + color;
    layer.draw();
}

document.querySelector("#anchor-radius").addEventListener("change", function(){
    if( points.length ){
        points.forEach( e => {
            e.attrs.radius = this.value;
        })
    }
    if( snappingCircleArea.length ){
        snappingCircleArea.forEach( e => {
            e.attrs.radius = parseInt(this.value) + standard_distance;
        })
    }
    anchor_radius = parseInt(this.value);
    layer.draw();
});

document.querySelector("#line-width").addEventListener("change", function(){
    if( snappingLineArea.length ){
        snappingLineArea.forEach( e => {
            e.attrs.strokeWidth = parseInt(this.value) + 2 * standard_distance;
        })
    }
    polylines.forEach( line => {
        line.attrs.strokeWidth = line_width;
    })
    line_width = parseInt(this.value);
    layer.draw();
});

document.querySelector(".erase").addEventListener("click", function(){
    if( !deletePoint && !deleteLine )
        clearPane();
    else{
        if( deletePoint ){
            var name = deletePoint.attrs.delete;
            removePoint(name);
        }
        else if( deleteLine ){
            var name = deleteLine.attrs.delete;
            removeLine(name);
        }
    }
});

function overDistance(pos1, pos2, standard){
    if( (pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.y - pos2.y) * (pos1.y - pos2.y) > standard * standard  ){
        return true;
    }
    else{
        return false;
    }
}

var pane = document.querySelector(".pane");

var width = pane.clientWidth;
var height = pane.clientHeight;

var anchor_bgcolor = "#066fe0";
var anchor_color = "#000000";
var line_color = "#066fe0";

var anchor_radius = 5;
var line_width = 2;

var standard_distance = 5;

var stage = new Konva.Stage({
    container: 'pane',
    width: width,
    height: height
});

var player = new Konva.Layer();
stage.add(player);

var layer = new Konva.Layer();

// draing status 
var drawing = false;            // true : drawing, false : no
// polygon data
var points = [];                // point circle konva object array
var pointIds = [];              // point circle indicator(id) array
var pointGroup = {};            // save the information for snapping
var snappingCircleArea = [];    // circle for snapping
var snappingLineArea = [];      // line for snapping
var lines = []; 
// variable for dragging point
var selectedPoint;              // selected point circle indicator(index of the id in pointIds array) for draggin;

var pointLineIndex = {};

var originZIndex = [];

var originLineZIndex = [];

var snapDestPoint;

var snapDestLine;

var polylines = [];

var new_poly;

var beforePoints;

var pointIDProduce = 0;

var lineIDProduce = 0;


stage.attrs.container.ondblclick = startEndDrawing;

stage.on("click", createPointLine);

stage.on("mousemove", updateLine);

stage.on('mouseup', dragEnd);

stage.add(layer);

function startEndDrawing(e) {
    if( drawing ) {
        drawing = false;
        var lastPointIndex = pointIds.pop();
        delete pointLineIndex[lastPointIndex];
        points.pop().remove();
        snappingCircleArea.pop().remove();
        snappingLineArea.pop().remove();
        polylines.pop().remove();

        
        var last_line_area = snappingLineArea.pop()
        var last_line_area_name = last_line_area.attrs.id;
        last_line_area.remove();
        var last_line_area_index; 

        polylines.pop().remove();
        if( deletePoint ){
            deletePoint.remove();
            deletePoint = undefined;
        }
        if( deleteLine ){
            deleteLine.remove();
            deleteLine = undefined;
        }

        pointLineIndex[points[points.length - 1].attrs.name].forEach( ( line, i) => {
            if( line.lineName == last_line_area_name ){
                last_line_area_index = i;
            }
        });

        pointLineIndex[points[points.length - 1].attrs.name].splice(last_line_area_index , 1);

        for( var key in pointLineIndex ){            
            pointLineIndex[key].forEach( (e, i) => {
                // console.log( key,  e );
                if( layer.findOne( "#" + e.lineName) == undefined ){
                    pointLineIndex[key].splice(i,1);
                }
            });
        }

        var newPointCount = points.length - beforePoints;
        if( newPointCount == 1 ){
            points.pop().remove();
            pointIds.pop();
            snappingCircleArea.pop().remove();
        }

        if( snappingLineArea.length != polylines.length ){
            polylines.pop().remove();
        }

        layer.draw();
        player.draw();
    }
    else{
        beforePoints = points.length;
        drawing = true;
        new_poly = true;
        var currentPoint = stage.getPointerPosition();
        createLineArea(currentPoint);
        createPoint(currentPoint);
        new_poly = false;
    }
}

function createPointLine(e) {    
    if (drawing) {
        var currentPoint = stage.getPointerPosition();
        if( snapDestPoint ){
            currentPoint.x = snapDestPoint.attrs.x;
            currentPoint.y = snapDestPoint.attrs.y;
        }
        createLineArea(currentPoint);
        createPoint(currentPoint);
        if( snapDestPoint ){
            var new_point_name = detectPoint.attrs.name;
            var old_name = points[points.length - 1].attrs.name;
            layer.find("." + old_name).forEach( e => {
                e.setName(new_point_name);
            });
            // Merge two point lines
            if( pointLineIndex[new_point_name] )
                pointLineIndex[new_point_name] = pointLineIndex[new_point_name].concat(pointLineIndex[old_name]);
            else{
                pointLineIndex[new_point_name] = pointLineIndex[old_name];
            }           
            delete pointLineIndex[old_name];
            snapDestPoint.remove();
            snapDestPoint = undefined;
        }
        if( snapDestLine ){
            var x0 = detectLine.attrs.points[0];
            var x1 = detectLine.attrs.points[2];
            var y0 = detectLine.attrs.points[1];
            var y1 = detectLine.attrs.points[3];

            var a = ( y1 - y0 ) / ( x1 - x0 );
            var b = ( x1 * y0 - x0 * y1 ) / ( x1 - x0 );

            var x = stage.getPointerPosition().x;
            var y = stage.getPointerPosition().y;
            var a1 = -1 * a;
            var b1 = y - a1 * x;

            var n_x = ( b - b1) / ( a1 - a );
            var n_y = (b * a1 - b1 * a) / ( a1 - a );
            if( overDistance({x: n_x, y: n_y}, {x: x, y: y}, standard_distance) ){
                var deltaX = Math.abs(n_x - x);
                var deltaY = Math.abs(n_y - y);
                if( deltaX < deltaY){
                    n_y = y;
                    n_x = (y - b) / a;
                }
                else if ( deltaX > deltaY){
                    n_x = x;
                    n_y = a * x + b;
                }
            }

            var id = "point" + pointIDProduce;
            pointIDProduce ++;
            
            var start_point = pointIds.indexOf(detectLine.attrs.start);
            
            var index_of = points.length - 1;           
            
            if( !overDistance( {x: points[index_of - 1].attrs.x, y: points[index_of - 1].attrs.y}, {x:n_x, y: n_y}, standard_distance )){
                snappingLineArea.pop().remove();
                return false;
            }            
            else{
                // update the current current point position & snapping point area position
                layer.find("." + points[index_of].attrs.name).forEach(e => {
                    e.setX(n_x);
                    e.setY(n_y);
                });
                // update the snapping Line area for the selected Point
                pointLineIndex[points[index_of].attrs.name].forEach(e => {
                    if (e.type == "start") {
                        layer.find("." + e.lineName).forEach(line => {
                            line.attrs.points[0] = n_x;
                            line.attrs.points[1] = n_y;
                        });
                        player.find("." + e.lineName + "_poly").forEach(line => {
                            line.attrs.points[0] = n_x;
                            line.attrs.points[1] = n_y;
                        });
                    }
                    else {
                        layer.find("." + e.lineName).forEach(line => {
                            line.attrs.points[2] = n_x;
                            line.attrs.points[3] = n_y;
                        });
                        player.find("." + e.lineName + "_poly").forEach(line => {
                            // console.log(line);
                            line.attrs.points[2] = n_x;
                            line.attrs.points[3] = n_y;
                        });
                    }
                })
                // creating the new snapping Line Area
                var line_id = "line" + lineIDProduce;
                lineIDProduce ++;
                var new_line_area = new Konva.Line({
                    points: [n_x, n_y, detectLine.attrs.points[2], detectLine.attrs.points[3]],
                    stroke: "transparent",
                    strokeWidth: line_width + 2 * standard_distance,
                    lineCap: 'round',
                    lineJoin: 'round',
                    id: line_id,
                    name: line_id,
                    start: id,
                    end: detectLine.attrs.end
                });
                new_line_area.on("mouseover", snapLineInfo);
                new_line_area.on("mouseout", snapLineInfoDelete);
                new_line_area.on("click", selectLine2Delete);
                var insert_pos = snappingLineArea.indexOf(detectLine);
                snappingLineArea.splice(insert_pos + 1, 0, new_line_area);
                layer.add(new_line_area);
                new_line_area.setZIndex(0);
                var new_polyline = new Konva.Line({
                    points: [n_x, n_y, detectLine.attrs.points[2], detectLine.attrs.points[3]],
                    stroke: line_color,
                    strokeWidth: line_width,
                    lineCap: 'round',
                    lineJoin: 'round',
                    id: line_id + "_poly",
                    name: line_id + "_poly",
                    start: id,
                    end: detectLine.attrs.end
                });
                polylines.splice(insert_pos + 1, 0, new_polyline);
                player.add(new_polyline);
                player.findOne("#" + detectLine.attrs.id + "_poly").attrs.points[2] = n_x;
                player.findOne("#" + detectLine.attrs.id + "_poly").attrs.points[3] = n_y;
                detectLine.attrs.points[2] = n_x;
                detectLine.attrs.points[3] = n_y;               

                pointLineIndex[points[points.length - 1].attrs.name].push({
                    lineName: detectLine.attrs.id, type: "end"
                });
                pointLineIndex[points[points.length - 1].attrs.name].push({
                    lineName: line_id, type: "start"
                });
                pointLineIndex[layer.findOne("#" + detectLine.attrs.end).attrs.name].forEach(line => {
                    if (line.lineName == detectLine.attrs.id) {
                        line.lineName = line_id;
                    }
                });
                var new_point = new Konva.Circle({
                    x: n_x,
                    y: n_y,
                    radius: anchor_radius,
                    fill: anchor_bgcolor,
                    stroke: anchor_color,
                    strokeWidth: 1,
                    id: id,
                    name: points[points.length - 1].attrs.name
                });
                new_point.on("mousedown", dragPoint);
                new_point.on("click", selectPoint2Delete);
                new_point.on('mouseover', hoverPoint);
                new_point.on('mouseout', outPoint);
                pointIds.splice(start_point + 1, 0, id);
                points.splice(start_point + 1, 0, new_point);
                layer.add(new_point);
                layer.draw();
                player.draw();
            }
            snapDestLine.remove();
            snapDestLine = undefined;
            layer.draw();
        }
    }
    // Please enable this if you `d like to draw with by only clicking.
    // else{
    //     if( !selectedPoint ){
    //         if( e.target.nodeType == "Stage" ){
    //             // clearPane();
    //             beforePoints = points.length;
    //             drawing = true;
    //             new_poly = true;
    //             var currentPoint = stage.getPointerPosition();
    //             createLineArea(currentPoint);
    //             createPoint(currentPoint);
    //             new_poly = false;
    //         }
    //     }
    // }
}

function updateLine(e) {
    if (drawing) {
        var currentPoint = stage.getPointerPosition();
        var length = polylines.length;
        polylines[length - 1].attrs.points[2] = currentPoint.x;
        polylines[length - 1].attrs.points[3] = currentPoint.y;
        player.draw();
        layer.draw();
    }
    if( selectedPoint != undefined ){
        updatePolygon();
    }
}

function createPoint(pos) {
    var id = "point" + pointIDProduce;
    pointIDProduce ++;
    var name = id;
    // real Point Generate
    var circle = new Konva.Circle({
        x: pos.x,
        y: pos.y,
        radius: anchor_radius,
        fill: anchor_bgcolor,
        stroke: anchor_color,
        strokeWidth: 1,
        id: id,
        name: name
    });
    circle.on("mousedown", dragPoint);
    circle.on("click", selectPoint2Delete);
    circle.on('mouseover', hoverPoint);
    circle.on('mouseout', outPoint);

    // Snapping Point area generate
    var area = new Konva.Ring({
        x: pos.x,
        y: pos.y,
        innerRadius: anchor_radius + 1,
        outerRadius: anchor_radius + standard_distance,
        fill: "transparent",
        stroke: "transparent",
        strokeWidth: 1,
        name: name,
        type: "area",
        id: id + "_ca",
    });

    area.on("mouseover", snapPointInfo);

    area.on('mouseout', snapPointInfoDelete);


    // Snapping LineArea & Index Update
    if( snappingLineArea.length > 1 && new_poly != true ){
        snappingLineArea[ snappingLineArea.length - 2 ].attrs.points[2] = pos.x;
        snappingLineArea[ snappingLineArea.length - 2 ].attrs.points[3] = pos.y;
        pointLineIndex[name] = [ { lineName : snappingLineArea[ snappingLineArea.length - 1 ].attrs.id, type: "start"},
                                {lineName: snappingLineArea[ snappingLineArea.length - 2 ].attrs.id, type: "end"}];
        snappingLineArea[ snappingLineArea.length - 1 ].attrs.start = id;
        snappingLineArea[ snappingLineArea.length - 2 ].attrs.end = id;
    }
    else{
        pointLineIndex[name] = [{ lineName : snappingLineArea[ snappingLineArea.length - 1 ].attrs.id, type: "start"}];
        snappingLineArea[ snappingLineArea.length - 1 ].attrs.start = id;
    }
    
    points.push(circle);
    pointIds.push(id);
    snappingCircleArea.push(area);
    layer.add(area).add(circle).draw();
}

function createLineArea(pos){
    var id = "line" + lineIDProduce;
    lineIDProduce ++;
    var lineArea = new Konva.Line({
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: "transparent",
        strokeWidth: line_width + 2 * standard_distance,
        lineCap: 'round',
        lineJoin: 'round',
        id: id,
        name: id,
        start: "",
        end: ""
    });
    

    var polyline = new Konva.Line({
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: line_color,
        strokeWidth: line_width,
        lineCap: 'round',
        lineJoin: 'round',
        id: id + "_poly",
        name: id + "_poly",
        start: "",
        end: ""
    });
    polylines.push(polyline);
    
    lineArea.on("mouseover", snapLineInfo);
    lineArea.on("mouseout", snapLineInfoDelete);
    lineArea.on("click", selectLine2Delete);
    snappingLineArea.push(lineArea);   
    layer.add(lineArea);    
    lineArea.setZIndex(0);
    layer.draw();
    player.add(polyline);
    player.draw();
}

function updatePolygon() {
    var pos = stage.getPointerPosition();
    var s_name = layer.findOne("#" + pointIds[selectedPoint]).attrs.name;
    points.forEach( el => {
        if( el.attrs.name == s_name ){
            el.setX(pos.x);
            el.setY(pos.y);
        }
    });

    if( deletePoint && deletePoint.attrs.delete == s_name ){
        deletePoint.setX(pos.x);
        deletePoint.setY(pos.y);
    }
    isdragged = true;

    snappingCircleArea.forEach( el => {
        if( el.attrs.name == s_name ){
            el.setX(pos.x);
            el.setY(pos.y);
        }
    });
    
    // Update the Snapping Line Area
    var connectedLines = pointLineIndex[s_name];
    connectedLines.forEach( lineIndex => {
        var type = lineIndex.type;
        var line = layer.findOne("#" + lineIndex.lineName)
        var polyline = player.findOne("#" + lineIndex.lineName + "_poly");
        if( type == "start" ){
            line.attrs.points[0] = pos.x;
            line.attrs.points[1] = pos.y;
            polyline.attrs.points[0] = pos.x;
            polyline.attrs.points[1] = pos.y;
        }
        else{
            line.attrs.points[2] = pos.x;
            line.attrs.points[3] = pos.y;
            polyline.attrs.points[2] = pos.x;
            polyline.attrs.points[3] = pos.y;
        }
    });

    player.draw();
    layer.draw();
}

function dragPoint(e) {
    if( !drawing ){
        selectedPoint = pointIds.indexOf(e.target.attrs.id);

        pointLineIndex[e.target.attrs.name].forEach(e => {
            var area = layer.findOne("#" + e.lineName)
            originLineZIndex.push(area.getZIndex());
        });

        layer._getNodesByName(e.target.attrs.name).forEach(e => {
            originZIndex.push(e.getZIndex());
        });

        layer._getNodesByName(e.target.attrs.name).forEach(e => {
            e.setZIndex(0);
        });

        pointLineIndex[e.target.attrs.name].forEach(e => {
            var area = layer.findOne("#" + e.lineName)
            area.setZIndex(0);
        });
    }
}

function dragEnd(e){
    if( !drawing ){
        if( selectedPoint != undefined ){
            var name = points[selectedPoint].attrs.name;
            layer.find("." + name).forEach( (e, i) => {
                e.setZIndex(originZIndex[i]);
            });        
    
            pointLineIndex[name].forEach( ( e, i ) => { 
                var area = layer.findOne("#" + e.lineName)
                area.setZIndex(originLineZIndex[i]);
            });
    
            var new_point_name;
            // Check the snap Status
            if( snapDestLine ){
                // snapping Line Handle
                var x0 = detectLine.attrs.points[0];
                var x1 = detectLine.attrs.points[2];
                var y0 = detectLine.attrs.points[1];
                var y1 = detectLine.attrs.points[3];
    
                var a = ( y1 - y0 ) / ( x1 - x0 );
                var b = ( x1 * y0 - x0 * y1 ) / ( x1 - x0 );
    
                var x = stage.getPointerPosition().x;
                var y = stage.getPointerPosition().y;
                var a1 = -1 * a;
                var b1 = y - a1 * x;
    
                var n_x = ( b - b1) / ( a1 - a );
                var n_y = (b * a1 - b1 * a) / ( a1 - a );
    
                if( overDistance({x: n_x, y: n_y}, {x: x, y: y}, standard_distance) ){
                    var deltaX = Math.abs(n_x - x);
                    var deltaY = Math.abs(n_y - y);
                    if( deltaX < deltaY){
                        n_y = y;
                        n_x = (y - b) / a;
                    }
                    else if ( deltaX > deltaY){
                        n_x = x;
                        n_y = a * x + b;
                    }
                }
                var id = "point" + pointIDProduce;
                pointIDProduce ++;
                
                var start_point = pointIds.indexOf(detectLine.attrs.start);
                
                // update the current selected point position & snapping point area position
                layer.find("." + points[selectedPoint].attrs.name ).forEach( e => {
                    e.setX(n_x);
                    e.setY(n_y);
                });
                // update the snapping Line area for the selected Point
                pointLineIndex[points[selectedPoint].attrs.name].forEach( e => {
                    if( e.type == "start" ){
                        layer.find("." + e.lineName).forEach( line => {
                            line.attrs.points[0] = n_x;
                            line.attrs.points[1] = n_y; 
                        });
                        player.find("." + e.lineName + "_poly").forEach( line => {
                            line.attrs.points[0] = n_x;
                            line.attrs.points[1] = n_y; 
                        })
                    }
                    else{
                        layer.find("." + e.lineName).forEach( line => {
                            line.attrs.points[2] = n_x;
                            line.attrs.points[3] = n_y; 
                        });
                        player.find("." + e.lineName + "_poly").forEach( line => {
                            line.attrs.points[2] = n_x;
                            line.attrs.points[3] = n_y; 
                        })
                    }
                })
                // creating the new snapping Line Area
                var line_id = "line" + lineIDProduce;
                lineIDProduce ++;
                var new_line_area = new Konva.Line({
                    points: [n_x, n_y, detectLine.attrs.points[2] ,detectLine.attrs.points[3] ],
                    stroke: "transparent",
                    strokeWidth: line_width + 2 * standard_distance,
                    lineCap: 'round',
                    lineJoin: 'round',
                    id: line_id,
                    name: line_id,
                    start: id,
                    end: detectLine.attrs.end
                });            
                new_line_area.on("mouseover", snapLineInfo);
                new_line_area.on("mouseout", snapLineInfoDelete);
                new_line_area.on("click", selectLine2Delete);
                snappingLineArea.push(new_line_area);
                layer.add(new_line_area);
                new_line_area.setZIndex(0);
                var polyline = new Konva.Line({
                    points: [n_x, n_y, detectLine.attrs.points[2] ,detectLine.attrs.points[3] ],
                    stroke: line_color,
                    strokeWidth: line_width,
                    lineCap: 'round',
                    lineJoin: 'round',
                    id: line_id + "_poly",
                    name: line_id + "_poly",
                    start: id,
                    end: detectLine.attrs.end
                });
                player.add(polyline);
                polylines.push(polyline);
                detectLine.attrs.points[2] = n_x;
                detectLine.attrs.points[3] = n_y;
    
                pointLineIndex[points[selectedPoint].attrs.name].push({
                    lineName: detectLine.attrs.id, type: "end"
                });
                pointLineIndex[points[selectedPoint].attrs.name].push({
                    lineName: line_id, type: "start"
                });
                pointLineIndex[ layer.findOne( "#" + detectLine.attrs.end).attrs.name ].forEach( line => {
                    if( line.lineName == detectLine.attrs.id ){
                        line.lineName = line_id;
                    }
                });
                var new_point = new Konva.Circle({
                    x: n_x,
                    y: n_y,
                    radius: anchor_radius,
                    fill: anchor_bgcolor,
                    stroke: anchor_color,
                    strokeWidth: 1,
                    id: id,
                    name: points[selectedPoint].attrs.name
                });
                new_point.on("mousedown", dragPoint);      
                new_point.on("click", selectPoint2Delete);
                new_point.on('mouseover', hoverPoint);
                new_point.on('mouseout', outPoint);
                pointIds.splice( start_point + 1, 0, id);
                points.splice(start_point + 1, 0, new_point);
                layer.add(new_point);
            }
    
            if(snapDestPoint){
                new_point_name = detectPoint.attrs.name;
                var old_name = points[selectedPoint].attrs.name;
                // delete the snapping circle area
                layer.find("." + old_name).forEach( e => {
                    e.setName(new_point_name);
                    e.setX(detectPoint.attrs.x);
                    e.setY(detectPoint.attrs.y);
                });
                // Merge two points
                points[selectedPoint].setX(detectPoint.attrs.x);
                points[selectedPoint].setY(detectPoint.attrs.y);
    
                var pos = {x: detectPoint.attrs.x, y: detectPoint.attrs.y}
                // update the snapping Line area
                pointLineIndex[old_name].forEach( e => {
                    if( e.type == "start" ){
                        layer.find("." + e.lineName).forEach( line => {
                            line.attrs.points[0] = pos.x;
                            line.attrs.points[1] = pos.y; 
                        })
                        player.find("." + e.lineName + "_poly").forEach( line => {
                            line.attrs.points[0] = pos.x;
                            line.attrs.points[1] = pos.y; 
                        })
                    }
                    else{
                        layer.find("." + e.lineName).forEach( line => {
                            line.attrs.points[2] = pos.x;
                            line.attrs.points[3] = pos.y; 
                        })
                        player.find("." + e.lineName + + "_poly").forEach( line => {
                            line.attrs.points[0] = pos.x;
                            line.attrs.points[1] = pos.y; 
                        })
                    }
                })
                // Merge two point lines
                pointLineIndex[new_point_name] = pointLineIndex[new_point_name].concat(pointLineIndex[old_name]);
    
                delete pointLineIndex[old_name] ;
            }
            originZIndex = [];
            originLineZIndex = [];
            layer.draw();
            player.draw();
            selectedPoint = undefined;
        }      
    }
    if( e.target.className == "Circle"){
    	if( !drawing && !isdragged ){
        var pointName = e.target.attrs.name;
        if (deleteLine) {
            deleteLine.remove();
            deleteLine = undefined;
        }
        if (deletePoint) {
            if( pointName != deletePoint.attrs.delete ){
                deletePoint.remove();
                deletePoint = new Konva.Ring({
                    x: e.target.attrs.x,
                    y: e.target.attrs.y,
                    innerRadius: anchor_radius + 1,
                    outerRadius: anchor_radius + 5,
                    fill: '#f005',
                    delete: pointName
                });
                player.add(deletePoint);
            }
            else{
                deletePoint.remove();
                deletePoint = undefined;
            }            
        }   
        else{
            deletePoint = new Konva.Ring({
                x: e.target.attrs.x,
                y: e.target.attrs.y,
                innerRadius: anchor_radius + 1,
                outerRadius: anchor_radius + 5,
                fill: '#f005',
                delete: pointName
            });
            player.add(deletePoint);
        }             
        player.draw();
    	}
    }
    isdragged = false;
}

function clearPane() {
    points.forEach( e => e.remove());
    snappingLineArea.forEach( e => e.remove());
    snappingCircleArea.forEach( e=> e.remove());
    polylines.forEach( e => e.remove());
    points = [];
    pointIds = [];
    snappingCircleArea = [];
    snappingLineArea = [];
    pointLineIndex = {};
    polylines = [];
    pointIDProduce = 0;
    lineIDProduce = 0;
    layer.find("Shape").forEach( e => {e.remove()});
    player.find("Shape").forEach( e => {e.remove()});
    layer.draw();
    player.draw();
}


var detectPoint;

function snapPointInfo(e){
    if( selectedPoint != undefined ){
        var s_name = points[selectedPoint].attrs.name;
        if( e.target.attrs.name != s_name ){
            if( !snapDestPoint ){
                snapDestPoint = new Konva.Circle({
                    x: e.target.attrs.x,
                    y: e.target.attrs.y,
                    stroke: "#64ff00",
                    strokeWidth: 2,
                    radius: 3,
                    fill: "#64ff00"
                });
                layer.add(snapDestPoint).draw();
                detectPoint = e.target;
            }            
        }
    }
    else if(drawing){
        if( !snapDestPoint ){
            snapDestPoint = new Konva.Circle({
                x: e.target.attrs.x,
                y: e.target.attrs.y,
                stroke: "#64ff00",
                strokeWidth: 2,
                radius: 3,
                fill: "#64ff00"
            });
            layer.add(snapDestPoint).draw();
            detectPoint = e.target;
        }       
    }
}

function snapPointInfoDelete(){
    if( snapDestPoint ){
        if( overDistance(stage.getPointerPosition(), {x: snapDestPoint.attrs.x, y: snapDestPoint.attrs.y}, anchor_radius + 1) == true ){
            snapDestPoint.remove();
            snapDestPoint = undefined;
            layer.draw();
            detectPoint = undefined;
        }        
    }    
}

var detectLine ;

function snapLineInfo(e){
    var selectedLine = e.target.attrs.id;
    if( selectedPoint != undefined ){
        var name = layer.findOne("#" + pointIds[selectedPoint]).attrs.name;
        var lines = pointLineIndex[name];
        var lineIds = [];
        lines.forEach( e => lineIds.push(e.lineName));
        if( lineIds.indexOf( selectedLine ) < 0 ){
            detectLine = e.target;
            var x1 = e.target.attrs.points[0];
            var y1 = e.target.attrs.points[1];
            var x2 = e.target.attrs.points[2];
            var y2 = e.target.attrs.points[3];
            snapDestLine = new Konva.Line({
                points: [x1, y1, x2, y2],
                stroke: "#64ff00",
                strokeWidth: 2,
            })
            layer.add(snapDestLine);
            layer.draw();
        }
    }
    else if(drawing){
        detectLine = e.target;
            var x1 = e.target.attrs.points[0];
            var y1 = e.target.attrs.points[1];
            var x2 = e.target.attrs.points[2];
            var y2 = e.target.attrs.points[3];
            snapDestLine = new Konva.Line({
                points: [x1, y1, x2, y2],
                stroke: "#64ff00",
                strokeWidth: 2,
            })
            layer.add(snapDestLine);
            layer.draw();
    }
    else{
        player.findOne("#" + selectedLine + "_poly").attrs.stroke = "#64ff00";
        player.draw();
    }
}

function snapLineInfoDelete(e){
    if( snapDestLine != undefined){
        snapDestLine.remove();
        snapDestLine = undefined;
        layer.draw();
        detectLine = undefined;
    }
    else{
        var name = e.target.attrs.id;
        if( player.findOne("#" + name + "_poly") ){
            player.findOne("#" + name + "_poly").attrs.stroke = line_color;
            player.draw();
        }
        else{
            snapDestLine.remove();
            snapDestLine = undefined;
            layer.draw();
            detectLine = undefined;
        }
    }
}

var deletePoint;
var isdragged;
function selectPoint2Delete(e){
    
}

var deleteLine;
function selectLine2Delete(e){
    if( !drawing ){
        var lineName = e.target.attrs.name;
        if (deletePoint) {
            deletePoint.remove();
            deletePoint = undefined;
        }
        if (deleteLine) {
            if( lineName != deleteLine.attrs.delete ){
                deleteLine.remove();
                deleteLine = new Konva.Line({
                    points: e.target.attrs.points,
                    stroke: "pink",
                    strokeWidth: line_width + 2,
                    delete: lineName,
                });
                player.add(deleteLine);        
            }
            else{
                deleteLine.remove();
                deleteLine = undefined;
            }
        }
        else{
            deleteLine = new Konva.Line({
                points: e.target.attrs.points,
                stroke: "pink",
                strokeWidth: line_width + 2,
                delete: lineName,
            });
            player.add(deleteLine);     
        }        
        player.draw();
    }    
}

function removePoint(name){
    layer.find("." + name).forEach( e => {
        if( e.attrs.type != "area"){
            e.remove();
            var id = e.attrs.id;
            var index = pointIds.indexOf(id);
            pointIds.splice(index, 1);
            points.splice(index, 1);
            // snappingCircleArea.splice(index, 1);
        }
        else{
            e.remove();
        }        
    } );
    pointLineIndex[name].forEach((line, index) =>{
        snappingLineArea.forEach( ( e, index) => {
            if( e.attrs.name == line.lineName ){
                var start = e.attrs.start;
                var end = e.attrs.end;
                e.remove();
                snappingLineArea.splice(index, 1);
                var startName;
                var endName;
                if( layer.findOne("#" + start) ){
                    startName = layer.findOne("#" + start).attrs.name;
                    pointLineIndex[startName].forEach( (el, index) => {
                        if( el.lineName == line.lineName ){
                            pointLineIndex[startName].splice(index, 1);
                        }
                    } );
                }
                    
                if( layer.findOne("#" + end) ){
                    endName = layer.findOne("#" + end).attrs.name;
                    pointLineIndex[endName].forEach( (el, index) => {
                        if( el.lineName == line.lineName ){
                            pointLineIndex[endName].splice(index, 1);
                        }
                    } );
                }
            }
        })
        polylines.forEach( (e, index) => {
            if( e.attrs.name == line.lineName + "_poly" ){
                e.remove();
                polylines.splice(index, 1);
            }
        })
    });
    delete pointLineIndex[name];
    var area_index = 0;
    for( var key in pointLineIndex){
        if( pointLineIndex[key].length == 0){
            layer.find("." + key).forEach( (e, i) => {
                if( e.attrs.type != "area"){
                    var id = e.attrs.id;
                    var remove_index = pointIds.indexOf(id);
                    e.remove();
                    pointIds.splice(remove_index, 1);
                    points.splice(remove_index, 1);
                }
                else{
                    e.remove();
                    // snappingCircleArea.splice(area_index, 1);
                    // area_index ++
                }                
            });
            delete pointLineIndex[key];
        }
    }

    deletePoint.remove();
    deletePoint = undefined;
    layer.draw();
    player.draw();
}

function removeLine(name){
    var line = layer.find("." + name)[0];
    var start_id = line.attrs.start;
    var end_id = line.attrs.end;
    var start_name = layer.findOne("#" + start_id).attrs.name;
    var end_name = layer.findOne("#" + end_id).attrs.name;
    var lines = [];
    snappingLineArea.forEach( (e, index) => {
        if( e.attrs.points[0] == line.attrs.points[0] && e.attrs.points[1] == line.attrs.points[1] && e.attrs.points[2] == line.attrs.points[2] && e.attrs.points[3] == line.attrs.points[3] ){
            lines.push( e.attrs.id );
            e.remove();
            player.findOne("#" + e.attrs.id + "_poly").remove();
            snappingLineArea.splice(index, 1);
            polylines.splice(index, 1);
        }
    });
    // console.log( lines );
    if( pointLineIndex[start_name] ){
        pointLineIndex[start_name].forEach( (e, index) => {
            // console.log(lines.indexOf(e.lineName));
            if( lines.indexOf(e.lineName) >= 0 ){
                pointLineIndex[start_name].splice(index, 1);
            } 
        })
    }
    if( pointLineIndex[end_name] ){
        pointLineIndex[end_name].forEach( (e, index) => {
            // console.log(lines.indexOf(e.lineName));
            if( lines.indexOf(e.lineName) >= 0 ){
                pointLineIndex[end_name].splice(index, 1);
            } 
        })
    }
    if( pointLineIndex[start_name].length == 0 ){
        layer.find("." + start_name).forEach( (e) => {
            if( e.attrs.type != "area"){
                var id = e.attrs.id;
                var remove_index = pointIds.indexOf(id);
                e.remove();
                pointIds.splice(remove_index, 1);
                points.splice(remove_index, 1);
            }
            else{
                e.remove();
            }
        });
        delete pointLineIndex[start_name];
    }
    if( pointLineIndex[end_name].length == 0){
        layer.find("." + end_name).forEach( (e) => {
            if( e.attrs.type != "area" ){
                var id = e.attrs.id;
                var remove_index = pointIds.indexOf(id);
                e.remove();
                pointIds.splice(remove_index, 1);
                points.splice(remove_index, 1);
            } 
            else{
                e.remove();
            }
        })
        delete pointLineIndex[end_name];
    };
    deleteLine.remove();
    deleteLine = undefined;
    layer.draw();
    player.draw();
}

document.body.addEventListener("keyup", function(e){
    if( e.keyCode == 46 ){
        if( deletePoint || deleteLine ){
            document.querySelector(".erase").click();
        }
    }
})

function hoverPoint(e){
    e.target.attrs.fill = "#64ff00";
    layer.draw();
}

function outPoint(e){
    e.target.attrs.fill = anchor_bgcolor;
    layer.draw();
}