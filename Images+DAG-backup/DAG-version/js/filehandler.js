class Filehandler {

  parsefile(filename){
    document.getElementById('inputfile')
            .addEventListener('change', function() {

            var fr=new FileReader();
            fr.onload=function(){
                document.getElementById('output')
                        .textContent=fr.result;
            }

            fr.readAsText(this.files[0]);
            console.log(fr.readAsText(this.files[0]));
        })
  }
}
