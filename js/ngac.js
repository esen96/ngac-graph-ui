class NgacDoc {

	#drawMode;

	constructor() {
		this.#drawMode = false;
	}

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
			
			this.nodePrompt(false);
			this.renderLayout();
		}
	}

	// Delete selected graph element
	deleteElement() {
		var element = cy.$(':selected');
		element.remove();
	}

	addEdge() {
		var source = document.getElementById('sourcefield').value;
		var target = document.getElementById('targetfield').value;
		var relation = document.getElementById('relationfield').value;

		cy.add({
			group: 'edges',
			data: { name: relation, source: source, target: target },
			classes: 'edgelabel'
		});

		this.edgePrompt(false);
		this.renderLayout();
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
	loadAttributes(){
		var attrfield = document.getElementById('attributefield');
		this.clearAttrField(attrfield);
		var fieldText = $('#typefield').find(":selected").text();
		var baseType = this.filterBaseType(fieldText);
		cy.nodes().forEach(function( ele ){
			if (ele.hasClass('attribute') && ele.hasClass(baseType)) {
				var option = document.createElement('option');
				var name = ele.data('name');
				option.text = name;
				attrfield.add(option);
			}
		});
	}

	// Filter base type (User/Object) from typefield text
	filterBaseType(typefield){
		if (typefield.includes('Object')){
			return 'Object';
		} else if (typefield.includes('User')) {
			return 'User';
		}
	}

	// Clear typefield text and add None option
	clearAttrField(attrfield){
		$("#attributefield").empty();
		var none = document.createElement('option');
		none.text = 'None';
		attrfield.add(none);
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
			this.loadAttributes();
			prompt.style.display = "block";
		} else {
			prompt.style.display = "none";
		}
	}

	// Toggle prompt for adding new edge
	edgePrompt(bool){
		var prompt = document.getElementById('add-relation');
		this.promptOverlay(bool);
		if (bool) {
			this.loadTargets();
			prompt.style.display = "block";
		} else {
			prompt.style.display = "none";
		}
	}

	// Load target & source data to edge prompt fields
	loadTargets(){
		var sourcefield = document.getElementById('sourcefield');
		var targetfield = document.getElementById('targetfield');
		$("#sourcefield").empty();
		$("#targetfield").empty();
		cy.nodes().forEach(function( ele ){

			if (ele.hasClass('attribute')){
				var option = document.createElement('option');
				var name = ele.data('name');
				option.text = name;
				if (ele.hasClass('User')) {
					sourcefield.add(option);
				} else if (ele.hasClass('Object')) {
					targetfield.add(option);
				}

			}
		});
	}

	// To avoid api and cytoscape id whitespace error
	getById(id){
		return cy.$("[id='" + id + "']");
	}

}
