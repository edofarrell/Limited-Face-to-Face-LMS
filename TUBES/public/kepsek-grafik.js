let label = [];
let dataset = [];
let myChart = '';

function onSuccess(response) {
    return response.text();
}

function showResult(text) {
    const arr = text.split('|');
    label = arr[0].split(',');
    dataset = arr[1].split(',');

    const data = {
        labels: label,
        datasets: [{
            label: 'Banyak Murid',
            backgroundColor: 'white',
            borderColor: 'black',
            data: dataset,
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    };

    myChart = new Chart(
        document.getElementById('grafik'),
        config
    );
}

fetch('/grafikMurid').then(onSuccess).then(showResult);

function gantiGrafik(e) {
    myChart.destroy();
    fetch(`/grafik${e.currentTarget.value}`).then(onSuccess).then(showResult);
}

const filter = document.querySelector('select')
filter.addEventListener('change', gantiGrafik)