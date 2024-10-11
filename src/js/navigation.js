function loadPage(pageId){
    $('#content > section').hide();
    $('#'+pageId).show();

    if(pageId ==='page1'|| pageId === 'page3'|| pageId === 'page4'){
      $('body').css('overflow', 'hidden');
    } else {
      $('body').css('overflow', 'auto');
    }
  }

$(document).ready(function(){
loadPage('page1');
});

const menuItems = Array.from(document.getElementsByClassName('menu-item'));

menuItems.forEach(item => {
item.addEventListener('click', function(e) {
    e.preventDefault(); 

    menuItems.forEach(i => i.classList.remove('active'));
    
    this.classList.add('active');
    });
});

const menuBar = document.getElementById('menuBar');
const title = document.getElementById('drivercomText');
const sidebar = document.getElementById('sidebar');
const brand = sidebar.getElementsByClassName('brand')[0];
const bx = brand.getElementsByClassName('bx')[0];

menuBar.addEventListener('click', function(){
    sidebar.classList.toggle('hide');
});







  