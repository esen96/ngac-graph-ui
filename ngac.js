// Delete selected graph element
function deleteElement() {
	cy.$(':selected').remove();
}

// Add graph node
function addNode() {
	let inputName = window.prompt("Enter name: ");
	cy.add({
	    group: 'nodes',
	    data: { name: inputName },
		});
}

// Control NGAC constraints before allowing placed edge (incomplete)
function controlEdge(sourceID, targetID) {

  let privilege = window.prompt("Enter access privilege: ");

  // Identify newly added edge
  var newEdge = cy.edges(
    '[source = "' + sourceID + '"]' +
    '[target = "' + targetID + '"]' +
    '[!name]' // Find the edge without a name, this will be the new one
  );

  newEdge.data('name', privilege)

  // TODO: Delete placed edge if constraints aren't met
}
