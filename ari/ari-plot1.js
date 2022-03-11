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
        // console.log(key);
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
    const downtownCoordinates = [32.716845, -117.162947],
      covidWeekNumber = 24,
      dataByWeek = d3.flatGroup(data, (d) => d.location_name + " : " + d.street_address).map((location) => {
        const locationCoordinates = [location[1][0].latitude, location[1][0].longitude],
          distanceFromSanDiego = Math.pow(
            Math.pow(locationCoordinates[0] - downtownCoordinates[0], 2) +
            Math.pow(locationCoordinates[1] - downtownCoordinates[1], 2),
            0.5
          );
        const weeklyVisitData = d3.flatGroup(
            location[1].sort(
              (a, b) => a.row_date.getTime() - b.row_date.getTime()
            ),
            (d, i) => Math.floor((i - 5) / 7) + 1
          ).map((d) => [d3.sum(d[1], (d, i) => d.visits_by_day), d[1]]),
          maxWeeklyVisits = d3.max(weeklyVisitData, (d) => d[0]);
        return [
          location[0],
          distanceFromSanDiego,
          weeklyVisitData,
          maxWeeklyVisits
        ];
      }),
      weeklyAverage = (weekNumber) => {
        return d3.mean(dataByWeek.map((loc) => loc[2][weekNumber][0]))
      },
      weeklyAverages = d3.range(57).map((weekNumber) => weeklyAverage(weekNumber))
    var cumulativeAverages = [weeklyAverages[0]];
    for (var weekNumber = 1; weekNumber < 57; weekNumber++) {
      cumulativeAverages.push((cumulativeAverages[weekNumber - 1] * weekNumber + weeklyAverages[weekNumber]) / (weekNumber + 1))
    }
    var cumulativePostCovidAverages = [weeklyAverages[24]]
    for (var i = 1, weekNumber = 25; weekNumber < 57; i++ && weekNumber++) {
      cumulativePostCovidAverages.push((cumulativePostCovidAverages[i - 1] * i + weeklyAverages[weekNumber]) / (i + 1))
    }
    window.dataByWeek = dataByWeek;
    const svgDim = {
        w: 1000,
        h: 500,
        p: 50
      },
      xScale = d3.scaleLinear()
      .domain([0, d3.max(dataByWeek, (d) => d[1]) * 1.1])
      .range([svgDim.p, svgDim.w - svgDim.p]),
      yScale = d3.scaleLinear()
      .domain([0, d3.max(dataByWeek, (d) => d[3] * 0.35)])
      .range([svgDim.h - svgDim.p, svgDim.p]),
      updateRepresentation = (weekNumber, reset) => {
        window.updatePlot3(weekNumber);
        const $svg = d3.select('#plot1SVG');
        var cumulativeAverage = cumulativeAverages[weekNumber],
          cumulativePostCovidAverage = -1;
        if (weekNumber > 24) {
          cumulativePostCovidAverage = cumulativePostCovidAverages[weekNumber - 24];
        }
        if (reset) {
          $svg
            .html('')
            .attr('width', svgDim.w)
            .attr('height', svgDim.h);
          $svg.append('g').call(d3.axisLeft(yScale)).attr('transform', 'translate(' + svgDim.p + ', 0)');
          $svg.append('g').call(d3.axisBottom(xScale).tickValues([])).attr('transform', 'translate(0, ' + (svgDim.h - svgDim.p) + ')');

          $svg.append('text')
            .text('Visits')
            .attr('text-anchor', 'middle')
            .attr('font-size', 12)
            .attr('transform', 'translate(13, ' + svgDim.h / 2 + ') rotate(-90)');

          $svg.append('text')
            .text('Distance from Downtown San Diego')
            .attr('text-anchor', 'middle')
            .attr('font-size', 12)
            .attr('transform', 'translate(' + svgDim.w / 2 + ',' + (svgDim.h - svgDim.p + 15) + ')');

          $svg.append('text')
            .text('Distance from Downtown San Diego vs Total Visits, by week')
            .attr('text-anchor', 'middle')
            .attr('font-size', 20)
            .attr('transform', 'translate(' + svgDim.w / 2 + ', 25)');

          $svg.append('rect')
            .attr('id', 'plot1CovidSpectre')
            .attr('x', svgDim.p)
            .attr('y', svgDim.p)
            .attr('width', svgDim.w - 2 * svgDim.p)
            .attr('height', svgDim.h - 2 * svgDim.p)
            .attr('fill', 'red')
            .attr('opacity', 0);
          const $dotsGroup = $svg
            .append('g')
            .attr('id', 'plot1Dots')
          $dotsGroup
            .selectAll('circle')
            .data(dataByWeek)
            .enter()
            .append('circle')
            .attr('r', 4)
            .attr('data-location', (d) => d[0].split(' : ')[0].replace("'", ''))
            .attr('cx', (d, i) => xScale(
              d[1]
            ))
            .attr('cy', (d, i) => yScale(
              d[2][weekNumber][0]
            ))
          $svg
            .append('line')
            .attr('id', 'plot1CumulativeLine')
            .attr('x1', svgDim.p)
            .attr('x2', svgDim.w - svgDim.p)
            .attr('y1', yScale(cumulativeAverage))
            .attr('y2', yScale(cumulativeAverage))
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
          $svg
            .append('text')
            .attr('id', 'plot1CumulativeLabel')
            .text('Total Cumulative Average')
            .attr('text-anchor', 'end')
            .attr('font-size', 12)
            .attr('x', svgDim.w - svgDim.p)
            .attr('y', yScale(cumulativeAverage) + 10)
          $svg
            .append('line')
            .attr('id', 'plot1PCCumulativeLine')
            .attr('x1', svgDim.p)
            .attr('x2', svgDim.w - svgDim.p)
            .attr('y1', yScale(cumulativePostCovidAverage))
            .attr('y2', yScale(cumulativePostCovidAverage))
            .attr('opacity', 0)
            .attr('stroke', 'grey')
            .attr('stroke-width', 1);
          $svg
            .append('text')
            .attr('id', 'plot1PCCumulativeLabel')
            .text('COVID Cumulative Average')
            .attr('text-anchor', 'end')
            .attr('font-size', 12)
            .attr('fill', 'grey')
            .attr('x', svgDim.w - svgDim.p)
            .attr('opacity', 0)
            .attr('y', yScale(cumulativePostCovidAverage) + 10)
          $svg
            .append('line')
            .attr('id', 'plot1PreCCumulativeLine')
            .attr('x1', svgDim.p)
            .attr('x2', svgDim.w - svgDim.p)
            .attr('y1', yScale(cumulativeAverages[23]))
            .attr('y2', yScale(cumulativeAverages[23]))
            .attr('opacity', 0)
            .attr('stroke', 'grey')
            .attr('stroke-width', 1);
          $svg
            .append('text')
            .attr('id', 'plot1PreCCumulativeLabel')
            .text('Pre-COVID Cumulative Average')
            .attr('text-anchor', 'end')
            .attr('font-size', 12)
            .attr('fill', 'grey')
            .attr('x', svgDim.w - svgDim.p)
            .attr('opacity', 0)
            .attr('y', yScale(cumulativeAverages[23]) + 10)
          return;
        }
        const $dotsGroup = $svg
          .select('#plot1Dots'),
          rowDate = weekNumber,
          covidDate = 24,
          endDate = 57,
          isAfterCovid = weekNumber > covidWeekNumber
        $dotsGroup
          .selectAll('circle')
          .transition('circleAnimate')
          .duration(200)
          .attr('fill', isAfterCovid ? 'hsl(0, 100%, ' + (50 - 50 * ((rowDate - covidDate) / (endDate - covidDate + 1))) + '%)' : 'black')
          .attr('cx', (d, i) => xScale(
            d[1]
          ))
          .attr('cy', (d, i) => yScale(
            d[2][weekNumber][0]
          ))
        $svg.select('#plot1CumulativeLine')
          .transition('lineAnimate')
          .duration(200)
          .attr('y1', yScale(cumulativeAverage))
          .attr('y2', yScale(cumulativeAverage))
        $svg.select('#plot1CumulativeLabel')
          .transition('textAnimate')
          .duration(200)
          .attr('y', yScale(cumulativeAverage) + 10)
        $svg.select('#plot1PCCumulativeLine')
          .transition('lineAnimate')
          .duration(200)
          .attr('y1', yScale(cumulativePostCovidAverage))
          .attr('y2', yScale(cumulativePostCovidAverage))
          .attr('opacity', isAfterCovid ? 1 : 0)
        $svg.select('#plot1PCCumulativeLabel')
          .transition('textAnimate')
          .duration(200)
          .attr('y', yScale(cumulativePostCovidAverage) + 10)
          .attr('opacity', isAfterCovid ? 1 : 0)
        $svg.select('#plot1PreCCumulativeLine')
          .transition('lineAnimate')
          .duration(200)
          .attr('opacity', isAfterCovid ? 1 : 0)
        $svg.select('#plot1PreCCumulativeLabel')
          .transition('textAnimate')
          .duration(200)
          .attr('opacity', isAfterCovid ? 1 : 0)
        $svg.select('#plot1CovidSpectre')
          .transition('spectreAnimate')
          .duration(200)
          .attr('opacity', isAfterCovid ? 0.25 : 0);
      };
    (function() {
      const $playButton = d3.select('#plot1PlayPause'),
        $resetButton = d3.select('#plot1Reset'),
        $weekRange = d3.select('#plot1WeekRange');
      var isPlaying = false,
        intervalID = null;
      const playPause = function() {
        isPlaying = !isPlaying;
        if (intervalID != null) {
          clearInterval(intervalID);
          intervalID = null;
        }
        if (isPlaying) {
          $playButton.text('Pause');
          $weekRange.attr('disabled', true);
          intervalID = setInterval(() => {
            const weekNumber = parseInt($weekRange.property('value')) + 1;
            if (weekNumber > 55) {
              playPause();
            }
            $weekRange.property('value', weekNumber);
            updateRepresentation(weekNumber);
          }, 200);
        } else {
          $playButton.text('Play');
          $weekRange.attr('disabled', null);
        }
      };
      const reset = function() {
        if (isPlaying) {
          playPause();
        }
        $weekRange.property('value', 0);
        updateRepresentation(0);
      };
      $playButton.on('click', playPause);
      $resetButton.on('click', reset);
      $weekRange.on('change', () => {
        const weekNumber = parseInt($weekRange.property('value'));
        updateRepresentation(weekNumber);
      });
    })();

    updateRepresentation(0, true);
  });
})();
