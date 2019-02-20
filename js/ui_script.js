var anchor_color_picker = new CP(document.querySelector("#anchor-color"));

var line_color_picker = new CP(document.querySelector("#line-color"));

var anchor_bgcolor_picker = new CP(document.querySelector("#anchor-bgcolor"));

anchor_color_picker.on("change", changeColorPicker);

anchor_bgcolor_picker.on("change", changeColorPicker);

line_color_picker.on("change", changeColorPicker);

function changeColorPicker(color){
    this.source.style.background = "#" + color;
}

anchor_color_picker.set('rgb(0, 0, 0)');
anchor_bgcolor_picker.set("#066fe0");
line_color_picker.set("#066fe0");
