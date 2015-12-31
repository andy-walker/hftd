<?php

/**
 * Quick and dirty php script for visualizing p/l csv files using highcharts
 */

$filename = isset($_GET['csv']) ? "../data/stats-{$_GET['csv']}.csv" : "../data/stats.csv";
$file = [];

# get data from appropriate csv file
if (($handle = fopen($filename, "r")) !== FALSE) {
    while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
        $file[] = $data;
    }
    fclose($handle);
}

$headers = array_shift($file);
array_shift($headers);
$algos = $headers;
$data = [];
$min = null;
$max = null;

# process data into params for highcharts
foreach ($file as $line) {
    $date = array_shift($line);
    foreach (array_keys($algos) as $key) {
        $data[$algos[$key]][] = [
            'date' => date('Y, m, d, H, i, s', strtotime($date)),
            'balance' => $line[$key]
        ];
        if (!isset($min) or $line[$key] < $min)
            $min = $line[$key];
        elseif (!isset($max) or $line[$key] > $max)
            $max = $line[$key]; 
    }
}

?><html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <script src="/bower_components/jquery/dist/jquery.js"></script>
  <script src="/bower_components/highcharts/highcharts.js"></script>
  <style>@import url("/style.css"); </style>
</head>
<body>
  <div id="container"></div>
  <script>
  $(function() {
    $('#container').highcharts({
        chart: {
            type: 'line',
            height:600
        },
        title: {
            text: 'Strategy comparison'
        },
        subtitle: {
            text: 'Algo p/l chart'
        },
        xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: { // don't display the dummy year
                month: '%e. %b',
                year: '%b'
            },
            title: {
                text: 'Date'
            }
        },
        yAxis: {
            title: {
                text: 'Account balance'
            },
            min: <?php print $min; ?>,
            max: <?php print $max; ?>
        },
        tooltip: {
            headerFormat: '<b>{series.name}</b><br>',
            pointFormat: '{point.x:%e. %b}: £{point.y:.2f}'
        },

        plotOptions: {
            spline: {
                marker: {
                    enabled: false
                }
            }
        },

        series: [
        <?php foreach ($data as $algo => $points): ?>
        {
            name: '<?php print $algo; ?>',
            data: [
              <?php foreach ($points as $key => $point): ?>
                [Date.UTC(<?php print $point['date']; ?>), <?php print $point['balance']; ?>],
              <?php endforeach; ?>
            ]
        }<?php if ($key != end(array_keys($data))) print ',' . PHP_EOL; ?>
        <?php endforeach; ?>
        ]
    });
});
</script>
</body>
</html>