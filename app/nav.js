// Page switching logic / navigation
let page = 1;

function setPage(num) {
    const pages = document.getElementsByClassName('page');
    const tabs = document.getElementsByClassName('tab');
    if (num > pages.length || num < 1) return setPage(1);

    // reset all pages and tabs
    for (let i = 0; i < pages.length; i++) {
        pages[i].classList.add('hidden');
        pages[i].classList.remove('flex');
        tabs[i].classList.remove('text-white/70', 'border-b-2', 'border-white/70');
        tabs[i].classList.add('text-white/30', 'border-b-2', 'border-transparent');
    }

    // show new page and dot
    page = num;
    pages[page - 1].classList.remove('hidden');
    pages[page - 1].classList.add('flex');
    tabs[page - 1].classList.remove('text-white/30', 'border-b-2', 'border-transparent');
    tabs[page - 1].classList.add('text-white/70', 'border-b-2', 'border-white/70');
}

setPage(1);