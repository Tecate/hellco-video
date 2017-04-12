$(function () {
	$.get('tracklist.txt', function(txt) {
	    var lines = txt.split("\n");
	    var randLineNum = Math.floor(Math.random() * lines.length);
	    alert(lines[randLineNum]);
	    // save(lines[randLineNum]); // random line from the text file
	});
});