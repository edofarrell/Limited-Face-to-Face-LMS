function changeURL(e){
    const newURL = `/rekap${e.currentTarget.value}`;
    const aElement = document.querySelector('.filter');
    aElement.href = newURL;
}

const filter = document.querySelector('select')
filter.addEventListener('change', changeURL)