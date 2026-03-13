document.querySelectorAll(".accordion-question").forEach(q=>{
  q.addEventListener("click",()=>{
    q.parentElement.classList.toggle("open")
  })
})

function addSpinner(btn){
  if(!btn.querySelector(".spinner")){
    const spinner = document.createElement("span");
    spinner.classList.add("spinner");
    btn.appendChild(spinner);
    btn.disabled = true;
    setTimeout(()=>{
      btn.removeChild(spinner);
      btn.disabled = false;
    },2000);
  }
}

document.getElementById("downloadBtn").addEventListener("click", function(){
  addSpinner(this);
});

document.getElementById("heroDownload").addEventListener("click", function(){
  addSpinner(this);
});
