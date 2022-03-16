(() => {
  const addDatePreprocessor = (data) => {
    var drCount = 0,
      locationTotals = {},
      lastMonth = undefined;
    return data.map((row) => {
      const conversions = {
        '': [parseInt, 'recordID'],
        'date_range_end': (date) => new Date(date),
        'date_range_start': (date) => new Date(date),
        'visits_by_day': parseInt,
        'latitude': parseFloat,
        'longitude': parseFloat,
        'naics_code': parseInt,
        'distance_from_home': parseFloat,
        'raw_visit_counts': parseInt,
        'raw_visitor_counts': parseInt
      };
      var returnRow = {};
      for (var key in row) {
        if (conversions[key] instanceof Array) {
          returnRow[conversions[key][1]] = conversions[key][0](row[key]);
          continue;
        } else if (conversions[key]) {
          returnRow[key] = conversions[key](row[key]);
          continue;
        }
        returnRow[key] = row[key];
      }
      const month = returnRow.date_range_start,
        location = returnRow.naics_code;
      if (month.getTime() == lastMonth) {
        drCount += 1;
      } else {
        drCount = 0;
        lastMonth = month.getTime();
      }
      var rowDate = new Date(month);
      rowDate.setDate(drCount + 1);
      returnRow['row_date'] = rowDate;
      return returnRow;
    });
  }
  loadData(addDatePreprocessor).then((data) => {
    const svgDim = {
        w: 1000,
        h: 500,
        p: 50
      },
      $svg = d3.select('#plot5SVG'),
      covidWeekNumber = 23,
      plotData = d3.flatGroup(
        d3.flatGroup(data, (d) => d.recordID)
        .map((row) => row[1][0]),
        (d) => d.location_name
      ).map(
        (pairing) => [
          pairing[0], d3.flatGroup(pairing[1].sort((a, b) => a.date_range_start.getTime() - b.date_range_start.getTime()).map((row) => ({
            date_range_start: row.date_range_start.toISOString().split('T')[0],
            monthly_visits: row.raw_visit_counts
          })), (row) => row.date_range_start).map((pair) => {
            const q1 = d3.quantile(pair[1], 0.25, (d) => d.monthly_visits),
              q3 = d3.quantile(pair[1], 0.75, (d) => d.monthly_visits),
              iqr = q3 - q1,
              min = q1 - 1.5 * iqr,
              max = q3 + 1.5 * iqr
            return [pair[0].split('-').slice(0, -1).join('-'), {
              median: d3.median(pair[1], (d) => d.monthly_visits),
              q1: q1,
              q3: q3,
              min: min,
              max: max
            }]
          })
        ]
      );

    $svg.attr('width', svgDim.w)
      .attr('height', svgDim.h)
      .attr('viewBox', '0 0 ' + svgDim.w + ' ' + svgDim.h);
    window.plot5Data = plotData;


    const drawGraph = (restaurant, reset) => {
      const restaurantData = plotData.filter((d) => d[0] == restaurant)[0][1];
      window.plot5RestaurantData = restaurantData;
      const xScale = d3.scaleBand()
        .domain(restaurantData.map((d) => d[0]))
        .range([svgDim.p, svgDim.w - svgDim.p]),
        yScale = d3.scaleLinear()
        .domain([d3.min(restaurantData, (d) => d[1].min) - 100, d3.max(restaurantData, (d) => d[1].max) + 100])
        .range([svgDim.h - svgDim.p, svgDim.p]);
      if (reset) {
        $svg.html('');
        $svg.append('text')
          .text('Total Visits By Month By Brand')
          .attr('text-anchor', 'middle')
          .attr('font-size', 20)
          .attr('transform', 'translate(' + svgDim.w / 2 + ', 25)');
        $svg.append('text')
          .text('Total Visits')
          .attr('text-anchor', 'middle')
          .attr('font-weight', 'bold')
          .attr('font-size', 12)
          .attr('transform', 'translate(13, ' + svgDim.h / 2 + ') rotate(-90)');
        $svg.append('text')
          .text('Month')
          .attr('font-weight', 'bold')
          .attr('text-anchor', 'middle')
          .attr('font-size', 12)
          .attr('transform', 'translate(' + svgDim.w / 2 + ',' + (svgDim.h - svgDim.p + 30) + ')');
        $svg.append('g').attr('class', 'plot5Axis').call(d3.axisLeft(yScale)).attr('transform', 'translate(' + svgDim.p + ', 0)')
        $svg.append('g').attr('class', 'plot5Axis').call(
          d3.axisBottom(xScale)
        ).attr('transform', 'translate(0, ' + (svgDim.h - svgDim.p) + ')');
        $svg.append('rect')
          .attr('x', xScale('2020-03') + 0.5 * xScale.bandwidth())
          .attr('y', svgDim.p)
          .attr('class', 'covidSpectre')
          .attr('width', svgDim.w - svgDim.p - (xScale('2020-03') + 0.5 * xScale.bandwidth()))
          .attr('height', svgDim.h - 2 * svgDim.p)
          .attr('opacity', 0.25)
        $svg.append('text')
          .attr('x', xScale('2020-03') + 5 + 0.5 * xScale.bandwidth())
          .attr('y', svgDim.p + 15)
          .attr('class', 'covidLabel')
          .attr('font-size', 12)
          .text('COVID-19 Pandemic');
        const monthGroups = $svg.selectAll('g.plot5month')
          .data(restaurantData)
          .enter()
          .append('g')
          .attr('class', 'plot5month');

        monthGroups.append('line')
          .attr('class', 'maxLine')
          .attr('x1', (d, i) => xScale(d[0]) + 0.5 * xScale.bandwidth())
          .attr('x2', (d, i) => xScale(d[0]) + 0.5 * xScale.bandwidth())
          .attr('y1', (d, i) => yScale(d[1].max))
          .attr('y2', (d, i) => yScale(d[1].min))
          .attr('stroke-width', 1)
          .attr('stroke', 'black')

        monthGroups.append('line')
          .attr('class', 'minLine')
          .attr('x1', (d, i) => xScale(d[0]) + 0.05 * xScale.bandwidth())
          .attr('x2', (d, i) => xScale(d[0]) + 0.95 * xScale.bandwidth())
          .attr('y1', (d, i) => yScale(d[1].min))
          .attr('y2', (d, i) => yScale(d[1].min))
          .attr('stroke-width', 1)
          .attr('stroke', 'black')

        monthGroups.append('line')
          .attr('class', 'minmax-line')
          .attr('x1', (d, i) => xScale(d[0]) + 0.05 * xScale.bandwidth())
          .attr('x2', (d, i) => xScale(d[0]) + 0.95 * xScale.bandwidth())
          .attr('y1', (d, i) => yScale(d[1].max))
          .attr('y2', (d, i) => yScale(d[1].max))
          .attr('stroke-width', 1)
          .attr('stroke', 'black')

        monthGroups.append('rect')
          .attr('x', (d, i) => xScale(d[0]) + 0.05 * xScale.bandwidth())
          .attr('width', (d, i) => xScale.bandwidth() * 0.9)
          .attr('y', (d, i) => yScale(d[1].q3))
          .attr('height', (d, i) => yScale(d[1].q1) - yScale(d[1].q3))
          .attr('class', 'iqrRect color-' + restaurant.replace(' ', '').replace("'", '').toLowerCase())
          .attr('stroke', 'black')
          .attr('stroke-width', 2)

        monthGroups.append('line')
          .attr('class', 'medianLine')
          .attr('x1', (d, i) => xScale(d[0]) + 0.05 * xScale.bandwidth() + 1)
          .attr('x2', (d, i) => xScale(d[0]) + 0.95 * xScale.bandwidth() - 1)
          .attr('y1', (d, i) => yScale(d[1].median))
          .attr('y2', (d, i) => yScale(d[1].median))
          .attr('stroke-width', 2)
          .attr('stroke', 'white')

        return;

      }
      $svg.selectAll('.plot5Axis').transition('hideAxis').duration(200).attr('opacity', 0)
      setTimeout(() => {
        $svg.selectAll('.plot5Axis').remove();
        $svg.append('g').attr('class', 'plot5Axis')
          .attr('opacity', 0)
          .call(d3.axisLeft(yScale)).attr('transform', 'translate(' + svgDim.p + ', 0)')
          .transition('showAxis').duration(200).attr('opacity', 1)
        $svg.append('g').attr('class', 'plot5Axis').attr('opacity', 0).call(
          d3.axisBottom(xScale)
        ).attr('transform', 'translate(0, ' + (svgDim.h - svgDim.p) + ')').transition('showAxis').duration(200).attr('opacity', 1);
      }, 250);

      const monthGroups = $svg.selectAll('.plot5month').data(restaurantData);
      monthGroups.each(function(d, i) {
        const monthGroup = d3.select(this);
        console.log(monthGroup.node())
        monthGroup.select('.iqrRect')
          .transition()
          .duration(200)
          .attr('x', xScale(d[0]) + 0.05 * xScale.bandwidth())
          .attr('width', xScale.bandwidth() * 0.9)
          .attr('y', yScale(d[1].q3))
          .attr('height', yScale(d[1].q1) - yScale(d[1].q3))
          .attr('class', 'iqrRect color-' + restaurant.replace(' ', '').replace("'", '').toLowerCase())
        console.log(monthGroup.select('.iqrRect').attr('y'))

        monthGroup.select('.medianLine')
          .transition()
          .duration(200)
          .attr('x1', xScale(d[0]) + 0.05 * xScale.bandwidth() + 1)
          .attr('x2', xScale(d[0]) + 0.95 * xScale.bandwidth() - 1)
          .attr('y1', yScale(d[1].median))
          .attr('y2', yScale(d[1].median))
          .attr('stroke', restaurant == "Wendy's" ? 'black' : 'white')
        monthGroup.selectAll('.minmax-line')
          .transition()
          .duration(200)
          .attr('x1', xScale(d[0]) + 0.05 * xScale.bandwidth())
          .attr('x2', xScale(d[0]) + 0.95 * xScale.bandwidth())
          .attr('y1', yScale(d[1].max))
          .attr('y2', yScale(d[1].max))
        monthGroup.selectAll('.minLine')
          .transition()
          .duration(200)
          .attr('x1', xScale(d[0]) + 0.05 * xScale.bandwidth())
          .attr('x2', xScale(d[0]) + 0.95 * xScale.bandwidth())
          .attr('y1', yScale(d[1].min))
          .attr('y2', yScale(d[1].min))
        monthGroup.selectAll('.maxLine')
          .transition()
          .duration(200)
          .attr('x1', xScale(d[0]) + 0.5 * xScale.bandwidth())
          .attr('x2', xScale(d[0]) + 0.5 * xScale.bandwidth())
          .attr('y1', yScale(d[1].max))
          .attr('y2', yScale(d[1].min))
      });

    };

    d3.selectAll('#plot5-radio input[type="radio"]').on('change', function() {
      if (this.checked) {
        const newRestaurant = d3.select(this).attr('value');
        drawGraph(newRestaurant, false);
      }
    })
    drawGraph("McDonald's", true)
  });
})();
