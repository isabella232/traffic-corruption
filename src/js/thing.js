var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();
var d3 = require('d3');
var request = require('d3-request');
var _ = require('lodash');

var MOBILE_THRESHOLD = 600;

var chartData = null;

var LABEL_DEFAULTS = {
    'text-anchor': 'middle',
    'font-size': 0.8,
    'rotate': 0
};

var LABELS = [
    {
        'country': 'Thailand',
        'rule_of_law': 0.655,
        'fatalities': 38,
        'text-anchor': 'start'
    },
    {
        'country': 'Afghanistan',
        'rule_of_law': 0.245,
        'fatalities': 19.0,
        'text-anchor': 'end'
    },
    {
        'country': 'Romania',
        'rule_of_law': 0.755,
        'fatalities': 25.0,
        'text-anchor': 'start'
    }
];

var ARROWS = [
    // Thailand
    {
        'path': [
            [0.65, 38.0],
            [0.58, 38.0],
            [0.535, 36.6]
        ]
    },
    // Afghanistan
    {
        'path': [
            [0.25, 19.0],
            [0.33, 18.5],
            [0.345, 16.2]
        ]
    },
    // Romania
    {
        'path': [
            [0.75, 25.0],
            [0.67, 23],
            [0.623, 9.6]
        ]
    }
];


function init () {
    d3.csv('./data/countries.csv', function(err, data) {
        chartData = data;

        update();
    });
}

var formatData = function(data) {
    /*
     * Restructure tabular data for easier charting.
     */
    var dataSeries = [];

    for (var column in data[0]) {
        if (column == 'year') {
            continue;
        }

        var values = [];

        for (var d in data) {
            // Remove nulls
            if (data[d][column] === null) {
                continue;
            }

            values.push({
                'year': data[d]['year'],
                'value': data[d][column]
            })
        }

        dataSeries.push({
            'name': column,
            'values': values
        });
    }

    return dataSeries;
}

function update () {
    var width = $('#interactive-content').width();

	if (width <= MOBILE_THRESHOLD) {
		isMobile = true;
	} else {
		isMobile = false;
	}

	renderChart({
		container: '#chart',
		width: width,
		data: chartData
	});

	// adjust iframe for dynamic content
	fm.resize()
}

function resize() {
	update()
}

/*
 * Render a chart.
 */
var renderChart = function(config) {
	/*
	 * Setup chart container.
	 */
	var margins = {
		top: 10,
		right: 20,
		bottom: 50,
		left: 30
	};

    var aspectRatio = 16/9;

	// Calculate actual chart dimensions
	var chartWidth = config['width'] - margins['left'] - margins['right'];
	var chartHeight = Math.ceil(config['width'] / aspectRatio) - margins['top'] - margins['bottom'];

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

	/*
	 * Create the root SVG element.
	 */
	var chartWrapper = containerElement.append('div')
		.attr('class', 'graphic-wrapper');

	var chartElement = chartWrapper.append('svg')
		.attr('width', chartWidth + margins['left'] + margins['right'])
		.attr('height', chartHeight + margins['top'] + margins['bottom'])
		.append('g')
		.attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

	/*
	 * Create D3 scale objects.
	 */
	var xScale = d3.scale.linear()
		.range([0, chartWidth])
		.domain([0, 1]);

	var yScale = d3.scale.linear()
		.range([chartHeight, 0])
		.domain([0, 40]);

	/*
	 * Create D3 axes.
	 */
	var xAxis = d3.svg.axis()
    	.scale(xScale)
    	.orient('bottom')
        .tickValues([0, 0.2, 0.4, 0.6, 0.8, 1])
        .tickFormat(function(d) {
            return d;
        });

    var xAxisLabels = d3.svg.axis()
    	.scale(xScale)
    	.orient('bottom')
        .tickValues([0, 1])
        .tickFormat(function(d) {
            if (d == 0) {
                return 'Less rule of law';
            } else if (d == 1) {
                return 'More rule of law';
            }
        });

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient('left')
        .tickValues([0, 10, 20, 30, 40])

	/*
	 * Render axes to chart.
	 */
	var xAxisElement = chartElement.append('g')
    		.attr('class', 'x axis')
    		.attr('transform', makeTranslate(0, chartHeight))
    		.call(xAxis)

    var xAxisLabelsElement = chartElement.append('g')
    		.attr('class', 'x labels')
    		.attr('transform', makeTranslate(0, chartHeight + 20))
    		.call(xAxisLabels)

    // Align edge ticks
    $('.x.axis .tick text').eq(0)
        .css('text-anchor', 'start')

    $('.x.labels .tick text').eq(0)
        .css('text-anchor', 'start')

    $('.x.axis .tick text').eq(-1)
        .css('text-anchor', 'end')

    $('.x.labels .tick text').eq(-1)
        .css('text-anchor', 'end')

	var yAxisElement = chartElement.append('g')
		.attr('class', 'y axis')
		.call(yAxis)

	/*
	 * Render grid to chart.
	 */
    var xAxisGrid = function() {
 		return xAxis;
 	};

 	xAxisElement.append('g')
 		.attr('class', 'x grid')
 		.call(xAxisGrid()
 			.tickSize(-chartHeight, 0)
 			.tickFormat('')
 		);

	var yAxisGrid = function() {
		return yAxis;
	};

	yAxisElement.append('g')
		.attr('class', 'y grid')
		.call(yAxisGrid()
			.tickSize(-chartWidth, 0)
			.tickFormat('')
		);

	/*
	 * Render values to chart.
	 */
     chartElement.append('g')
         .attr('class', 'dots')
         .selectAll('circle')
         .data(config['data'])
         .enter()
         .append('circle')
            .attr('r', isMobile ? 3 : 5)
            .attr('cx', function(d) {
                return xScale(d['rule_of_law']);
            })
            .attr('cy', function(d) {
                return yScale(d['fatalities']);
            })
            .attr('class', function(d, i) {
                return 'dot ' + classify(d['income_group']);
            })
            .attr('id', function(d) {
                return classify(d['country']);
            });

    /*
     * Render labels and arrows.
     */
    chartElement.append('defs')
         .append('marker')
         .attr('id','arrowhead')
         .attr('orient','auto')
         .attr('viewBox','0 0 5.108 8.18')
         .attr('markerHeight','8.18')
         .attr('markerWidth','5.108')
         .attr('orient','auto')
         .attr('refY','4.09')
         .attr('refX','5')
         .append('polygon')
         .attr('points','0.745,8.05 0.07,7.312 3.71,3.986 0.127,0.599 0.815,-0.129 5.179,3.999')
         .attr('fill','#4C4C4C')

    var arrowLine = d3.svg.line()
        .interpolate('basis')
        .x(function(d) {
            return xScale(d[0]);
        })
        .y(function(d) {
            return yScale(d[1]);
        });

    var arrows = chartElement.append('g')
        .attr('class', 'arrows');

    arrows.selectAll('path')
        .data(ARROWS)
        .enter().append('path')
        .attr('d', function(d) { return arrowLine(d['path']); })
        .style('marker-end', 'url(#arrowhead)');

    var labels = chartElement.append('g')
      .attr('class', 'labels');

    labels.selectAll('text')
        .data(LABELS)
        .enter().append('text')
        .attr('x', function(d) {
            return xScale(d['rule_of_law']);
        })
        .attr('y', function(d) {
            return yScale(d['fatalities'])
        })
        .attr('text-anchor', function(d) {
            return d['text-anchor'] || LABEL_DEFAULTS['text-anchor'];
        })
        .style('alignment-baseline', function(d) {
            return 'middle';
        })
        .html(function(d) {
            return d['country'];
        });

    var annotation = chartElement.append('text')
        .attr('id', 'annotation')
        .attr('x', function(d) {
            return xScale(0) - 5;
        })
        .attr('y', function(d) {
            return yScale(40) + 1
        })
        .attr('text-anchor', 'start')
        .style('alignment-baseline', 'middle')
        .style('font-size', '16px')
        .html('deaths per 100,000 people');

    var bbox = annotation.node().getBBox();
    console.log(bbox);

    chartElement.append('rect')
        .attr('id', 'annotation-background')
        .attr('x', bbox.x)
        .attr('y', bbox.y)
        .attr('width', bbox.width + 5)
        .attr('height', bbox.height + 5)

    annotation.moveToFront();
}

/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 */
var classify = function(str) {
	return str.toLowerCase()
		.replace(/\s+/g, '-')					 // Replace spaces with -
		.replace(/[^\w\-]+/g, '')			 // Remove all non-word chars
		.replace(/\-\-+/g, '-')				 // Replace multiple - with single -
		.replace(/^-+/, '')						 // Trim - from start of text
		.replace(/-+$/, '');						// Trim - from end of text
}

/*
 * Convert key/value pairs to a style string.
 */
var formatStyle = function(props) {
	var s = '';

	for (var key in props) {
		s += key + ': ' + props[key].toString() + '; ';
	}

	return s;
}

/*
 * Create a SVG tansform for a given translation.
 */
var makeTranslate = function(x, y) {
	var transform = d3.transform();

	transform.translate[0] = x;
	transform.translate[1] = y;

	return transform.toString();
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var throttleRender = throttle(resize, 250);

$(document).ready(function () {
	// adjust iframe for loaded content
	fm.resize()
	$(window).resize(throttleRender);
	init();
});
