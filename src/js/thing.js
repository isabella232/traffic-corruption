var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();
var d3 = require('d3');
var request = require('d3-request');
var _ = require('lodash');

var MOBILE_THRESHOLD = 600;

var chartData = null;

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
		right: 10,
		bottom: 50,
		left: 50
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
		.tickFormat(function(d, i) {
			return d;
		});

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
            });
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

var throttleRender = throttle(resize, 250);

$(document).ready(function () {
	// adjust iframe for loaded content
	fm.resize()
	$(window).resize(throttleRender);
	init();
});
