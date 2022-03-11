(function() {
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
    const covidWeekNumber = 24,
      dataByWeek = d3.flatGroup(
        data, (d) => d.location_name.toLowerCase().replace("'", "").replace(" ", "")).map((location) => {
        const weeklyVisitData = d3.flatGroup(d3.flatGroup(
          location[1].sort(
            (a, b) => a.row_date.getTime() - b.row_date.getTime()
          ),
          (d, i) => d.row_date.toISOString().split("T")[0]
        ).map((d) => [d[0], d3.sum(d[1], (d, i) => d.visits_by_day), d[1]]), (d, i) => Math.floor((i - 5) / 7) + 1).map((week) => [week[1][0][0], week[1].slice(-1)[0][0], d3.sum(week[1], (d) => d[1]) / 7]);
        return [
          location[0],
          weeklyVisitData
        ];
      });
    const plotData = d3.range(57).map((weekNumber) => {
      var weekObject = {
        total: 0
      };
      dataByWeek.map((location) => {
        if (!weekObject.bounds) {
          weekObject.bounds = [location[1][weekNumber][0], location[1][weekNumber][1]];
        }
        weekObject[location[0]] = location[1][weekNumber][2];
        weekObject.total += location[1][weekNumber][2];
      });
      return weekObject
    }).slice(1);
    window.plot3Data = plotData;
    const svgDim = {
        w: 1000,
        h: 500,
        p: 50
      },
      $svg = d3.select('#plot3SVG');
    $svg.attr('width', svgDim.w)
      .attr('height', svgDim.h);

    const xScale = d3.scaleBand()
      .domain(d3.range(1, 57))
      .range([svgDim.p, svgDim.w - svgDim.p]),
      yScale = d3.scaleLinear()
      .domain([0, d3.max(plotData, (d) => d.total) * 1.10])
      .range([svgDim.h - svgDim.p, svgDim.p]),
      stack = d3.stack().keys(['mcdonalds', 'wendys', 'burgerking'])(plotData)
    $svg.append('g').call(d3.axisLeft(yScale)).attr('transform', 'translate(' + svgDim.p + ', 0)');
    $svg.append('g').call(
      d3.axisBottom(xScale)
      .tickValues([24])
      .tickFormat((week) => week == 24 ? "Week of March 13, 2020" : "")
    ).attr('transform', 'translate(0, ' + (svgDim.h - svgDim.p) + ')');
    $svg.append('text')
      .text('Average Total Weekly Visits')
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('transform', 'translate(13, ' + svgDim.h / 2 + ') rotate(-90)');
    const $playLine = $svg.append('line')
      .attr('x1', xScale(1))
      .attr('x2', xScale(1))
      .attr('y1', svgDim.p)
      .attr('y2', svgDim.h - svgDim.p)
      .attr('stroke-width', 1)
      .attr('stroke', 'black')
      .attr('opacity', 0);
    $svg.append('text')
      .text('Week')
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('transform', 'translate(' + svgDim.w / 2 + ',' + (svgDim.h - svgDim.p + 30) + ')');
    window.xScale = xScale;
    $svg.append('text')
      .text('Average Weekly Total Visits, by brand')
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('transform', 'translate(' + svgDim.w / 2 + ', 25)');
    $svg.append('rect')
      .attr('x', xScale(24) + 0.5 * xScale.bandwidth())
      .attr('y', svgDim.p)
      .attr('width', svgDim.w - svgDim.p - (xScale(24) + 0.5 * xScale.bandwidth()))
      .attr('height', svgDim.h - 2 * svgDim.p)
      .attr('fill', 'red')
      .attr('opacity', 0.25)
    const $legend = $svg
      .append('g')
      .attr('id', 'plot3Legend'),
      legendData = [
        ['McDonald\'s', 'McDonalds'],
        ['Wendy\'s', 'Wendys'],
        ['Burger King', 'Burger King']
      ]
    $legend.selectAll('rect')
      .data(legendData)
      .enter()
      .append('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('x', 0)
      .attr('y', (d, i) => 15 * i)
      .attr('data-location', (d) => d[1]);
    $legend.selectAll('text')
      .data(legendData)
      .enter()
      .append('text')
      .attr('x', 15)
      .attr('y', (d, i) => 10 + 15 * i)
      .attr('font-size', 12)
      .text((d) => d[0]);
    const groups = $svg.selectAll('.plot3Group')
      .data(stack)
      .enter()
      .append('g')
      .attr('class', 'plot3Group')
      .attr('id', (d, i) => 'plot3Group-' + ['mcdonalds', 'wendys', 'burgerking'][i]);
    groups
      .selectAll('rect')
      .data((d) => [d, console.log(d)][0])
      .enter()
      .append('rect')
      .attr('x', (d, i) => xScale(i + 1) + xScale.bandwidth() * 0.1)
      .attr('width', (d, i) => xScale.bandwidth() * 0.8)
      .attr('height', (d, i) => yScale(d[0]) - yScale(d[1]))
      .attr('y', (d, i) => yScale(d[1]))
      .attr('stroke', (d, i) => i == 25);
    const legendBBox = $legend.node().getBBox();
    $legend.attr('transform', 'translate(' + (svgDim.w - svgDim.p - legendBBox.width - 10) + ', ' + (svgDim.p + 10) + ')')
    window.updatePlot3 = (weekNumber) => {
      console.log(weekNumber);
      if (weekNumber == 0) {
        $playLine
          .transition('returnPlayLine')
          .duration(200)
          .attr('x1', xScale(1))
          .attr('x2', xScale(1))
          .attr('opacity', 0)
      } else {
        $playLine
          .transition('playLine')
          .duration(200)
          .attr('x1', xScale(weekNumber) + 0.5 * xScale.bandwidth())
          .attr('x2', xScale(weekNumber) + 0.5 * xScale.bandwidth())
          .attr('opacity', 1)
      }
    };
  });
})();
