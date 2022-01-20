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
