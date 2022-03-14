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
      $svg = d3.select('#plot2SVG'),
      covidWeekNumber = 23,
      plotData = d3.flatGroup(
        d3.flatGroup(
          data.sort((a, b) => a.row_date.getTime() - b.row_date.getTime()),
          (d) => d.row_date.toISOString().split("T")[0]
        ).map((d, i) => [d[0], d3.sum(d[1].map((r) => r.visits_by_day))]), (d, i) => Math.floor((i - 5) / 7)
      ).filter((d, i) => i > 0 && i < 57).map((d, i) => [d[0], {
        bounds: [d[1][0][0], d[1].slice(-1)[0][0]],
        avgTraffic: d3.mean(d[1], (r) => r[1])
      }]),
      xScale = d3.scaleBand()
      .domain(d3.range(plotData.length))
      .range([svgDim.p, svgDim.w - svgDim.p]),
      yScale = d3.scaleLinear()
      .domain([ /*d3.min(plotData, (d) => d[1].avgTraffic)*/ 0, d3.max(plotData, (d) => d[1].avgTraffic)])
      .range([svgDim.h - svgDim.p, svgDim.p]);
    window.plot2Data = plotData;
    $svg.attr('width', svgDim.w)
      .attr('height', svgDim.h)
      .attr('viewBox', '0 0 ' + svgDim.w + ' ' + svgDim.h);
      $svg.append('text')
        .text('Average Daily Total Visits Per Week')
        .attr('text-anchor', 'middle')
        .attr('font-size', 20)
        .attr('transform', 'translate(' + svgDim.w / 2 + ', 25)');
    $svg.append('text')
      .text('Average Total Daily Visits')
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .attr('font-size', 12)
      .attr('transform', 'translate(13, ' + svgDim.h / 2 + ') rotate(-90)');
    $svg.append('text')
      .text('Week')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('transform', 'translate(' + svgDim.w / 2 + ',' + (svgDim.h - svgDim.p + 30) + ')');
    $svg.append('g').call(d3.axisLeft(yScale)).attr('transform', 'translate(' + svgDim.p + ', 0)')
    $svg.append('g').call(
      d3.axisBottom(xScale)
      .tickValues([23])
      .tickFormat((week) => week == 23 ? "Week of March 15, 2020" : "")
    ).attr('transform', 'translate(0, ' + (svgDim.h - svgDim.p) + ')');
    const $playLine = $svg.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', svgDim.p)
      .attr('y2', svgDim.h - svgDim.p)
      .attr('stroke-width', 1)
      .attr('stroke', 'black')
      .attr('opacity', 0);
    $svg.append('rect')
      .attr('x', xScale(23) + 0.5 * xScale.bandwidth())
      .attr('y', svgDim.p)
      .attr('class', 'covidSpectre')
      .attr('width', svgDim.w - svgDim.p - (xScale(23) + 0.5 * xScale.bandwidth()))
      .attr('height', svgDim.h - 2 * svgDim.p)
      .attr('opacity', 0.25)
    $svg.append('text')
      .attr('x', xScale(23) + 5 + 0.5 * xScale.bandwidth())
      .attr('y', svgDim.p + 15)
      .attr('class', 'covidLabel')
      .attr('font-size', 12)
      .text('COVID-19 Pandemic');
    $svg.append('path')
      .attr('id', 'plot2-path')
      .attr('d', d3.line()(plotData.map((d, i) => [xScale(i) + 0.5 * xScale.bandwidth(), yScale(d[1].avgTraffic)])))
      .attr('fill', 'none')
      .attr('stroke-width', 1)
      .attr('stroke', 'black');
    $svg.append('g')
      .attr('id', 'plot2-dotsGroup')
      .selectAll('circle')
      .data(plotData)
      .enter()
      .append('circle')
      .attr('cx', (d, i) => xScale(i) + 0.5 * xScale.bandwidth())
      .attr('cy', (d, i) => yScale(d[1].avgTraffic))
      .attr('r', (d, i) => i < 23 ? 5 : 6)
      .attr('fill', (d, i) => i < 23 ? 'grey' : 'black')
      .attr('opacity', 0.8)
      .attr('cursor', 'pointer')
      .on('click', (e, d) => {
        updatePlot1(d[0] + 1);
      })
      .on('mouseover', function(e, d, i) {
        d3.select(this).transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('r', 8);
        d3.selectAll('.unifiedTooltipContainer[data-week="' + d[0] + '"]').attr('display', 'block')
          .transition()
          .duration(200)
          .attr('opacity', 1)
      })
      .on('mouseout', function(e, d, i) {
        d3.select(this).transition()
          .duration(200)
          .attr('r', d[0] < 23 ? 5 : 6)
          .attr('opacity', 0.8);
        d3.selectAll('.unifiedTooltipContainer[data-week="' + d[0] + '"]')
          .transition()
          .duration(200)
          .attr('opacity', 0)
          .on('end', function() {
            d3.select(this).attr('display', 'none')
          })
      });

    const tooltipContainers = $svg.selectAll('g.plot2TooltipContainer')
      .data(plotData)
      .enter()
      .append('g')
      .attr('class', 'plot2TooltipContainer unifiedTooltipContainer')
      .attr('data-week', (d, i) => i)
      .attr('opacity', 0)
    tooltipContainers.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', 'white')
      .attr('stroke', 'grey')
      .attr('stroke-width', 1);
    tooltipContainers.append('text')
      .text((d) => d[1].bounds.join('—'))
      .attr('x', 5)
      .attr('y', 16)
      .attr('font-size', 15)
      .attr('font-weight', 'bold');
    tooltipContainers.append('text')
      .attr('class', 'plot2tooltip-secondary')
      .attr('x', 5)
      .attr('y', 27)
      .attr('font-size', 12)
      .text((d) => Math.trunc(d[1].avgTraffic) + ' average total daily visits');

    d3.selectAll('.plot2TooltipContainer')
      .each(function(d, i) {
        const tooltip = d3.select(this);
        const bbox = this.getBBox();
        // console.log(bbox);
        tooltip.select('rect').attr('width', bbox.width + 10)
          .attr('height', bbox.height + 5)
        if (xScale(i) + xScale.bandwidth() * 0.5 + bbox.width + 10 > svgDim.w) {
          tooltip.attr('transform', (d) => 'translate(' + (xScale(
            i
          ) + xScale.bandwidth() * 0.5 - bbox.width - 7) + ', ' + (yScale(
            d[1].avgTraffic
          ) + 6) + ')')
        } else {
          tooltip.attr('transform', (d) => 'translate(' + (xScale(
            i
          ) + xScale.bandwidth() * 0.5 + 7) + ', ' + (yScale(
            d[1].avgTraffic
          ) + 7) + ')')
        }

      }).attr('display', 'none')

    window.updatePlot2 = (weekNumber) => {
      // console.log(weekNumber);
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
          .attr('x1', xScale(weekNumber - 1) + 0.5 * xScale.bandwidth())
          .attr('x2', xScale(weekNumber - 1) + 0.5 * xScale.bandwidth())
          .attr('opacity', 1)
      }
    };
  });
})();
