class NgacDoc {

	#drawMode;

	constructor() {
		this.#drawMode = false;
	}

	// Add graph node
	addNode() {

		var ele_name = document.getElementById('namefield').value;
		if (this.nameTaken(ele_name)) {
			window.alert('Name is already taken');
		} else {
			var attr = document.getElementById('attributefield').value;
			var type = document.getElementById('typefield').value;

			cy.add({
				group: 'nodes',
				data: { id: ele_name, name: ele_name },
				classes: type
			});

			// Assign to attribute if one was selected
			if (attr != 'None') {
				this.getById(ele_name).move({parent: attr});
			}

			this.updateAttributes();
			this.nodePrompt(false);
			this.renderLayout();
		}
	}

	// Delete selected graph element
	deleteElement() {
		var element = cy.$(':selected');
		element.remove();
		this.updateAttributes();
	}

	// Control NGAC constraints before allowing placed edge (incomplete)
	controlEdge() {

	  // Identify newly added edge
	  var newEdge = cy.edges(
	    '[source = "' + document.getElementById('sourcefield').placeholder + '"]' +
	    '[target = "' + document.getElementById('targetfield').placeholder + '"]' +
	    '[!name]'  // The edge without a name will be newly added
	  );

		// TODO: Delete placed edge and alert if constraints aren't met
		var edgeName = document.getElementById('relationfield').value;
	  newEdge.data('name', edgeName);
		newEdge.addClass('edgelabel');

		this.edgePrompt(false);

	}

	// Toggles draw- and pan mode buttons
	displayDrawMode(bool) {
		if (this.#drawMode != bool) {
			this.#drawMode = !this.#drawMode;
			$('#draw-on').toggleClass('drawon');
			$('#draw-off').toggleClass('drawoff');
			return true; // Overlay fix to extension bug
		}
	}

	renderLayout(){
		var layout = cy.layout({
			name: 'cose-bilkent',
			animate: 'end',
			animationEasing: 'ease-out',
			animationDuration: 2000,
			randomize: true
		});

		layout.run();
	}

	// Load all parents to the attribute field in add element prompt
	updateAttributes(){
		$("#attributefield").empty();
		var attrfield = document.getElementById('attributefield');
		var none = document.createElement('option');
		none.text = 'None';
		attrfield.add(none);
		cy.nodes().forEach(function( ele ){
			if (ele.hasClass('attribute')) {
				var option = document.createElement('option');
				var name = ele.data('name');
				option.text = name;
				attrfield.add(option);
			}
		});
	}

	// Check if name is taken by another user/object
	nameTaken(name){
		var isTaken = false; // cy.nodes has its own return clause
		cy.nodes().forEach(function( ele ){
			if (ele.data('name') == name) {
				isTaken = true;
			}
		});
		return isTaken;
	}

	// Toggle full-screen div overlay to halt graph manipulation
	promptOverlay(bool) {
		var overlay = document.getElementById('prompt-overlay');
		if (bool) {
			var winH = window.innerHeight;
			overlay.style.height = winH+'px';
			overlay.style.display = "block";
		} else {
			overlay.style.display = "none";
		}
	}

	// Toggle prompt for adding new node
	nodePrompt(bool){
		var prompt = document.getElementById('add-element');
		this.promptOverlay(bool);
		if (bool) {
			prompt.style.display = "block";
		} else {
			prompt.style.display = "none";
		}
	}

	// Toggle prompt for adding new edge
	edgePrompt(bool, source, target){
		var prompt = document.getElementById('add-relation');
		this.promptOverlay(bool);
		if (bool) {
			this.loadEdgeData(source, target);
			prompt.style.display = "block";
		} else {
			prompt.style.display = "none";
		}
	}

	// Load target & source data to edge prompt fields
	loadEdgeData(source, target){
		var sourcefield = document.getElementById('sourcefield');
		var targetfield = document.getElementById('targetfield');
		sourcefield.placeholder = source;
		targetfield.placeholder = target;
	}

	// To avoid api and cytoscape id whitespace error
	getById(id){
		return cy.$("[id='" + id + "']");
	}

}
