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
    const svgDim = {
        w: 1000,
        h: 500,
        p: 50
      },
      $svg = d3.select('#plot3SVG'),
      covidWeekNumber = 23,
      plotData = d3.flatGroup(
        d3.flatGroup(
          data.sort((a, b) => a.row_date.getTime() - b.row_date.getTime()),
          (d) => d.row_date.toISOString().split("T")[0]
        ).map((d) => [d[0], d3.sum(d[1].map((r) => r.visits_by_day))]), (d, i) => Math.floor((i - 5) / 7) + 1
      ).map((d) => [d[0], {bounds: [d[1][0][0], d[1].slice(-1)[0][0]], avgTraffic: d3.mean(d[1], (r) => r[1])}]),
      xScale = d3.scaleBand()
      .domain(plotData.map((d) => d[0]))
      .range([svgDim.p, svgDim.w - svgDim.p]),
      yScale = d3.scaleLinear()
      .domain([d3.min(plotData, (d) => d[1].avgTraffic),  d3.max(plotData, (d) => d[1].avgTraffic)])
      .range([svgDim.h - svgDim.p, svgDim.p]);
    window.plot2Data = plotData;
    $svg.attr('width', svgDim.w)
      .attr('height', svgDim.h);

    window.updatePlot2 = (weekNumber) => {
      // // console.log(weekNumber);
      // if (weekNumber == 0) {
      //   $playLine
      //     .transition('returnPlayLine')
      //     .duration(200)
      //     .attr('x1', xScale(1))
      //     .attr('x2', xScale(1))
      //     .attr('opacity', 0)
      // } else {
      //   $playLine
      //     .transition('playLine')
      //     .duration(200)
      //     .attr('x1', xScale(weekNumber) + 0.5 * xScale.bandwidth())
      //     .attr('x2', xScale(weekNumber) + 0.5 * xScale.bandwidth())
      //     .attr('opacity', 1)
      // }
    };
  });
})();
