// JavaScript Document
//Load the AJAX API

google.charts.load('current', {
    'packages': ['corechart']
});
google.charts.setOnLoadCallback(drawChart1);
google.charts.setOnLoadCallback(drawChart2);
google.charts.setOnLoadCallback(drawChart3);
google.charts.load('current', {
    'packages': ['corechart', 'bar']
});
google.charts.setOnLoadCallback(drawStuff);
google.charts.load('current', {
    'packages': ['corechart']
});
google.charts.setOnLoadCallback(drawChart4);

/* ------------ 円グラフ 男女比 -------------- */

function drawChart1() {

    var data = google.visualization.arrayToDataTable([
        ['sex', 'number'],
        ['男性', 　66],
        ['女性', 　33]
    ]);

    var options = {
        legend: {
            textStyle: {
                fontSize: 15
            }
        },
        pieSliceTextStyle: {
            fontName: 'Meiryo UI',
            fontSize: 10
        },
    };

    var chart = new google.visualization.PieChart(document.getElementById('piechart'));

    chart.draw(data, options);
}

/* ------------  有給休暇取得率 -------------- */

function drawChart2() {
    var data = google.visualization.arrayToDataTable([
        ['donutchart', 'Percentage'],
        ['取得率', 1],
        ['', 99]
    ]);

    var options = {
        legend: 'none',
        pieSliceTextStyle: {
            fontName: 'Meiryo UI',
            fontSize: 15,
            italic: true,
            bold: true
        },
        pieStartAngle: 60,
        tooltip: {
            trigger: 'none'
        },
        slices: {
            0: {
                color: 'green'
            },
            1: {
                color: 'transparent'
            }
        }
    };

    var chart = new google.visualization.PieChart(document.getElementById('pacman'));
    chart.draw(data, options);
}

/* ------------  売り上げ推移 -------------- */

function drawChart3() {
    var data = google.visualization.arrayToDataTable([
        ["Element", "Density", {
            role: "style"
        }],
        ["2020", 0, "silver"],
        ["2039", 0, "silver"],
        ["2047", 0, "silver"],
        ["3947", 0, "color: gold"]
    ]);

    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1, {
            calc: "stringify",
            sourceColumn: 1,
            type: "string",
            role: "annotation"
        },
        2
    ]);

    var options = {
        bar: {
            groupWidth: "95%"
        },
        legend: {
            position: "none"
        },
        annotations: {
            textStyle: {
                fontName: 'Times-Roman',
                fontSize: 10,
                bold: true,
                italic: true,
                color: '#871b47',
            }
        }
    };
    var chart = new google.visualization.ColumnChart(document.getElementById("columnchart_values"));
    chart.draw(view, options);
}

/* ------------  平均月間残業時間 -------------- */

function drawStuff() {
    var chartDiv = document.getElementById('chart_div');

    var data = google.visualization.arrayToDataTable([
        ['Year', 'ディレクター', 'マネージャ', '怪文書'],
        ['2020', 0, 30, 1],
        ['2039', 0, 30, 1],
        ['2047', 0, 30, 1],
        ['3947', 0, 30, 1]
    ]);

    var classicOptions = {
        legend: {
            position: 'top',
            textStyle: {
                fontSize: 15
            }
        },
    };

    function drawClassicChart() {
        var classicChart = new google.visualization.ColumnChart(chartDiv);
        classicChart.draw(data, classicOptions);
    }

    drawClassicChart();
};

/* ------------  年間採用数推移 -------------- */

function drawChart4() {
    var data = google.visualization.arrayToDataTable([
        ['Year', 'ディレクター', 'マネージャ', '怪文書'],
        ['2020', 0, 0, 0],
        ['2039', 0, 0, 0],
        ['2047', 0, 0, 0],
        ['3947', 0, 0, 0]
    ]);

    var options = {
        legend: {
            position: 'top',
            textStyle: {
                fontSize: 15
            }
        },
        hAxis: {
            title: ''
        }
    };

    var chart = new google.visualization.AreaChart(document.getElementById('chart_adopt'));
    chart.draw(data, options);
}