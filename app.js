//ari-preprocessing.js
(function() {
  var cachedData = null;
  window.loadData = function(preprocessor) {
    if (!preprocessor) {
      preprocessor = (data) => data;
    }
    return new Promise(function(accept, reject) {
      // console.log(cachedData);
      if (cachedData) {
        return accept(preprocessor(cachedData));
      }
      const filePath = "Cleaned.csv"
      d3.csv(filePath).then((data) => {
        cachedData = data;
        return accept(preprocessor(data));
      })
    });
  }
})();
//ari-plot1.js
loadData().then(() => {
(function() {
  const endDate = 56;

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
      covidWeekNumber = 23,
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
      });
    // console.log(dataByWeek);
    const weeklyAverage = (weekNumber) => {
        return d3.mean(dataByWeek.map((loc) => loc[2][weekNumber][0]))
      },
      weeklyAverages = d3.range(endDate + 1).map((weekNumber) => weeklyAverage(weekNumber))
    var cumulativeAverages = [weeklyAverages[0]];
    for (var weekNumber = 1; weekNumber < endDate + 1; weekNumber++) {
      cumulativeAverages.push((cumulativeAverages[weekNumber - 1] * weekNumber + weeklyAverages[weekNumber]) / (weekNumber + 1))
    }
    var cumulativePostCovidAverages = [weeklyAverages[covidWeekNumber]]
    for (var i = 1, weekNumber = covidWeekNumber + 1; weekNumber < weeklyAverages.length; i++ && weekNumber++) {
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
        window.updatePlot2(weekNumber);
        const $svg = d3.select('#plot1SVG');
        var cumulativeAverage = cumulativeAverages[weekNumber],
          cumulativePostCovidAverage = -1;
        if (weekNumber > covidWeekNumber) {
          cumulativePostCovidAverage = cumulativePostCovidAverages[weekNumber - covidWeekNumber];
        }
        if (reset) {
          $svg
            .html('')
            .attr('width', svgDim.w)
            .attr('height', svgDim.h)
            .attr('viewBox', '0 0 ' + svgDim.w + ' ' + svgDim.h);
          $svg.append('g').call(d3.axisLeft(yScale)).attr('transform', 'translate(' + svgDim.p + ', 0)');
          $svg.append('g').call(d3.axisBottom(xScale).tickValues([])).attr('transform', 'translate(0, ' + (svgDim.h - svgDim.p) + ')');

          $svg.append('text')
            .text('Visits')
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', 12)
            .attr('transform', 'translate(13, ' + svgDim.h / 2 + ') rotate(-90)');

          $svg.append('text')
            .text('Distance from Downtown San Diego')
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', 12)
            .attr('transform', 'translate(' + svgDim.w / 2 + ',' + (svgDim.h - svgDim.p + 15) + ')');

          $svg.append('text')
            .text('Distance from Downtown San Diego vs Total Visits')
            .attr('text-anchor', 'middle')
            .attr('font-size', 20)
            .attr('transform', 'translate(' + svgDim.w / 2 + ', 25)');

          const firstWeek = dataByWeek[0][2][0][1]
          $svg.append('text')
            .text('week of ' + [firstWeek[0].row_date, firstWeek.slice(-1)[0].row_date].map((d) => d.toISOString().split("T")[0]).join(' to '))
            .attr('id', 'weekOfText')
            .attr('text-anchor', 'middle')
            .attr('font-size', 20)
            .attr('transform', 'translate(' + svgDim.w / 2 + ', 45)');

          $svg.append('rect')
            .attr('id', 'plot1CovidSpectre')
            .attr('class', 'covidSpectre')
            .attr('x', svgDim.p)
            .attr('y', svgDim.p)
            .attr('width', svgDim.w - 2 * svgDim.p)
            .attr('height', svgDim.h - 2 * svgDim.p)
            .attr('opacity', 0);
          $svg.append('text')
            .attr('x', svgDim.p + 5)
            .attr('y', svgDim.p + 15)
            .attr('id', 'plot1CovidLabel')
            .attr('class', 'covidLabel')
            .attr('font-size', 12)
            .text('COVID-19 Pandemic')
            .attr('opacity', 0)
          const $dotsGroup = $svg
            .append('g')
            .attr('id', 'plot1Dots')
          $dotsGroup
            .selectAll('circle')
            .data(dataByWeek)
            .enter()
            .append('circle')
            .attr('r', 6)
            .attr('class', (d) => "color-" + d[0].split(' : ')[0].replace("'", '').replace(" ", "").toLowerCase())
            .attr('cx', (d, i) => xScale(
              d[1]
            ))
            .attr('cy', (d, i) => yScale(
              d[2][weekNumber][0]
            ))
            .attr('opacity', 1)
            .attr('cursor', 'pointer')
            .attr('data-location', (d) => d[0])
            .on('mouseenter', function() {
              const circle = d3.select(this);
              const location = circle.attr('data-location');
              d3.select('.plot1TooltipContainer[data-location="' + location + '"]')
                .attr('display', 'inline')
                .transition('show')
                .duration(100)
                .attr('opacity', 1);
            })
            .on('mouseout', function() {
              const circle = d3.select(this);
              const location = circle.attr('data-location');
              d3.select('.plot1TooltipContainer[data-location="' + location + '"]')
                .transition('hide')
                .duration(100)
                .attr('opacity', 0)
                .on('end', function() {
                  d3.select(this).attr('display', 'none')
                });
            });
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
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'end')
            .attr('pointer-events', 'none')
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
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
          $svg
            .append('text')
            .attr('id', 'plot1PCCumulativeLabel')
            .text('COVID Cumulative Average')
            .attr('text-anchor', 'end')
            .attr('pointer-events', 'none')
            .attr('font-size', 12)
            .attr('fill', 'black')
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
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
          $svg
            .append('text')
            .attr('id', 'plot1PreCCumulativeLabel')
            .text('Pre-COVID Cumulative Average')
            .attr('text-anchor', 'end')
            .attr('pointer-events', 'none')
            .attr('font-size', 12)
            .attr('fill', 'black')
            .attr('x', svgDim.w - svgDim.p)
            .attr('opacity', 0)
            .attr('y', yScale(cumulativeAverages[23]) + 10)

          const $legend = $svg
            .append('g')
            .attr('id', 'plot1Legend'),
            legendData = [
              ['McDonald\'s', 'mcdonalds'],
              ['Wendy\'s', 'wendys'],
              ['Burger King', 'burgerking']
            ]
          $legend.selectAll('rect')
            .data(legendData)
            .enter()
            .append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('x', 0)
            .attr('y', (d, i) => 15 * i)
            .attr('class', (d) => "color-" + d[1]);
          $legend.selectAll('text')
            .data(legendData)
            .enter()
            .append('text')
            .attr('x', 15)
            .attr('y', (d, i) => 10 + 15 * i)
            .attr('font-size', 12)
            .text((d) => d[0]);

          const tooltipContainers = $svg.selectAll('g.plot1TooltipContainer')
            .data(dataByWeek)
            .enter()
            .append('g')
            .attr('class', 'plot1TooltipContainer')
            .attr('data-location', (d) => d[0])
            .attr('opacity', 0)
          tooltipContainers.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('fill', 'white')
            .attr('stroke', 'grey')
            .attr('stroke-width', 1);
          tooltipContainers.append('text')
            .text((d) => d[0])
            .attr('x', 5)
            .attr('y', 16)
            .attr('font-size', 15)
            .attr('font-weight', 'bold');
          tooltipContainers.append('text')
            .attr('class', 'plot1tooltip-secondary')
            .attr('x', 5)
            .attr('y', 27)
            .attr('font-size', 12)
            .text((d) => d[2][weekNumber][0]);

          d3.selectAll('.plot1TooltipContainer')
            .each(function(d) {
              const tooltip = d3.select(this);
              const bbox = this.getBBox();
              // console.log(bbox);
              tooltip.select('rect').attr('width', bbox.width + 10)
                .attr('height', bbox.height + 5)
              if (xScale(d[1]) + bbox.width + 10 > svgDim.w) {
                tooltip.attr('transform', (d) => 'translate(' + (xScale(
                  d[1]
                ) - bbox.width - 16) + ', ' + (yScale(
                  d[2][weekNumber][0]
                ) + 6) + ')')
              } else {
                tooltip.attr('transform', (d) => 'translate(' + (xScale(
                  d[1]
                ) + 6) + ', ' + (yScale(
                  d[2][weekNumber][0]
                ) + 6) + ')')
              }

            }).attr('display', 'none')
          const legendBBox = $legend.node().getBBox();
          $legend.attr('transform', 'translate(' + (svgDim.w - svgDim.p - legendBBox.width - 10) + ', ' + (svgDim.p + 10) + ')')
          return;
        }
        const $dotsGroup = $svg
          .select('#plot1Dots'),
          rowDate = weekNumber,
          covidDate = 23,
          isAfterCovid = weekNumber > covidWeekNumber

        d3.selectAll('.plot1TooltipContainer')
          .each(function(d) {
            const bbox = d3.select(this).attr('display', 'block').node().getBBox(),
              tooltip = d3.select(this);
            d3.select(this).attr('display', 'none');
            // console.log(bbox);
            if (xScale(d[1]) + bbox.width + 10 > svgDim.w) {
              tooltip.attr('transform', (d) => 'translate(' + (xScale(
                d[1]
              ) - bbox.width - 16) + ', ' + (yScale(
                d[2][weekNumber][0]
              ) + 6) + ')')
            } else {
              tooltip.attr('transform', (d) => 'translate(' + (xScale(
                d[1]
              ) + 6) + ', ' + (yScale(
                d[2][weekNumber][0]
              ) + 6) + ')')
            }
            d3.select(this).select('.plot1tooltip-secondary')
              .text((d) => d[2][weekNumber][0]);
          });


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
        $svg.select('#plot1CovidLabel')
          .transition('spectreAnimate')
          .duration(200)
          .attr('opacity', isAfterCovid ? 1 : 0);
        const currentWeek = dataByWeek[0][2][weekNumber][1];
        $svg.select('#weekOfText')
          .text('week of ' + [currentWeek[0].row_date, currentWeek.slice(-1)[0].row_date].map((d) => d.toISOString().split("T")[0]).join(' to '))
      };
    (function() {
      const $playButton = d3.select('#plot1PlayPause'),
        $resetButton = d3.selectAll('.plot1Reset'),
        $backButton = d3.select('#plot1Back'),
        $endButton = d3.select('#plot1End'),
        $fwdButton = d3.select('#plot1Fwd'),
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
              $backButton.attr('disabled', null);
              $resetButton.attr('disabled', null);
              const weekNumber = parseInt($weekRange.property('value')) + 1;
              if (weekNumber >= endDate) {
                playPause();
                $playButton.attr('disabled', true);
                $fwdButton.attr('disabled', true);
                $endButton.attr('disabled', true);
              }
              $weekRange.property('value', weekNumber);
              updateRepresentation(weekNumber);
            }, 200);
          } else {
            $playButton.text('Play');
            $weekRange.attr('disabled', null);
          }
        },
        reset = function() {
          if (isPlaying) {
            playPause();
          }
          $weekRange.property('value', 0);
          updateRepresentation(0);
          $backButton.attr('disabled', true);
          $resetButton.attr('disabled', true);
          $playButton.attr('disabled', null);
          $fwdButton.attr('disabled', null);
          $endButton.attr('disabled', null);
        },
        fwd = () => {
          if (isPlaying) {
            playPause();
          }
          const weekNumber = parseInt($weekRange.property('value'));
          if (weekNumber + 1 >= endDate) {
            $playButton.attr('disabled', true);
            $fwdButton.attr('disabled', true);
            $endButton.attr('disabled', true);
          } else {
            $playButton.attr('disabled', null);
            $endButton.attr('disabled', null);
          }
          $backButton.attr('disabled', null);
          $resetButton.attr('disabled', null);
          $weekRange.property('value', weekNumber + 1);
          updateRepresentation(weekNumber + 1);
        },
        back = () => {
          if (isPlaying) {
            playPause();
          }
          const weekNumber = parseInt($weekRange.property('value'));
          $playButton.attr('disabled', null);
          $endButton.attr('disabled', null);
          $fwdButton.attr('disabled', null);
          if (weekNumber - 1 == 0) {
            $backButton.attr('disabled', true);
            $resetButton.attr('disabled', true);
          }
          $weekRange.property('value', weekNumber - 1);
          updateRepresentation(weekNumber - 1);
        },
        end = () => {
          if (isPlaying) {
            playPause();
          }
          const weekNumber = endDate;
          $playButton.attr('disabled', true);
          $fwdButton.attr('disabled', true);
          $endButton.attr('disabled', true);
          $backButton.attr('disabled', null);
          $resetButton.attr('disabled', null);
          $weekRange.property('value', weekNumber);
          updateRepresentation(weekNumber);
        }
      $playButton.on('click', playPause);
      $resetButton.on('click', reset);
      $fwdButton.on('click', fwd);
      $backButton.on('click', back);
      $endButton.on('click', end);
      $weekRange.on('input', () => {
        const weekNumber = parseInt($weekRange.property('value'));
        if (weekNumber >= endDate) {
          $playButton.attr('disabled', true);
          $fwdButton.attr('disabled', true);
          $endButton.attr('disabled', true);
        } else {
          $playButton.attr('disabled', null);
          $fwdButton.attr('disabled', null);
          $endButton.attr('disabled', null);
        }
        if (weekNumber == 0) {
          $backButton.attr('disabled', true);
          $resetButton.attr('disabled', true);
        } else {
          $backButton.attr('disabled', null);
          $resetButton.attr('disabled', null);
        }
        updateRepresentation(weekNumber);
      });
      window.updatePlot1 = function(weekNumber) {
        $weekRange.property('value', weekNumber);
        if (weekNumber >= endDate) {
          $playButton.attr('disabled', true);
          $fwdButton.attr('disabled', true);
          $endButton.attr('disabled', true);
        } else {
          $playButton.attr('disabled', null);
          $fwdButton.attr('disabled', null);
          $endButton.attr('disabled', null);
        }
        if (weekNumber == 0) {
          $backButton.attr('disabled', true);
          $resetButton.attr('disabled', true);
        } else {
          $backButton.attr('disabled', null);
          $resetButton.attr('disabled', null);
        }
        updateRepresentation(weekNumber);
      };
    })();

    updateRepresentation(0, true);
  });
})();
//ari-plot2.js
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
//ari-plot3.js
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
      .attr('height', svgDim.h)
      .attr('viewBox', '0 0 ' + svgDim.w + ' ' + svgDim.h);

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
      .tickFormat((week) => week == 24 ? "Week of March 15, 2020" : "")
    ).attr('transform', 'translate(0, ' + (svgDim.h - svgDim.p) + ')');
    $svg.append('text')
      .text('Average Total Weekly Visits')
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
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
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('transform', 'translate(' + svgDim.w / 2 + ',' + (svgDim.h - svgDim.p + 30) + ')');
    $svg.append('text')
      .text('Average Weekly Total Visits, by brand')
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('transform', 'translate(' + svgDim.w / 2 + ', 25)');
    $svg.append('rect')
      .attr('x', xScale(24) + 0.5 * xScale.bandwidth())
      .attr('y', svgDim.p)
      .attr('class', 'covidSpectre')
      .attr('width', svgDim.w - svgDim.p - (xScale(24) + 0.5 * xScale.bandwidth()))
      .attr('height', svgDim.h - 2 * svgDim.p)
      .attr('opacity', 0.25)
    $svg.append('text')
      .attr('x', xScale(24) + 5 +  0.5 * xScale.bandwidth())
      .attr('y', svgDim.p + 15)
      .attr('class', 'covidLabel')
      .attr('font-size', 12)
      .text('COVID-19 Pandemic')
    const $legend = $svg
      .append('g')
      .attr('id', 'plot3Legend'),
      legendData = [
        ['McDonald\'s', 'mcdonalds'],
        ['Wendy\'s', 'wendys'],
        ['Burger King', 'burgerking']
      ]
    $legend.selectAll('rect')
      .data(legendData)
      .enter()
      .append('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('x', 0)
      .attr('y', (d, i) => 15 * i)
      .attr('class', (d) => "color-" + d[1]);
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
      .attr('class', (d, i) => 'plot3Group color-' + ['mcdonalds', 'wendys', 'burgerking'][i]);
    groups
      .selectAll('rect')
      .data((d) => d)
      .enter()
      .append('rect')
      .attr('x', (d, i) => xScale(i + 1) + xScale.bandwidth() * 0.1)
      .attr('width', (d, i) => xScale.bandwidth() * 0.8)
      .attr('height', (d, i) => yScale(d[0]) - yScale(d[1]))
      .attr('y', (d, i) => yScale(d[1]))
      .attr('stroke', (d, i) => i == 25);
    const legendBBox = $legend.node().getBBox();
    $legend.attr('transform', 'translate(' + (svgDim.w - svgDim.p - legendBBox.width - 10) + ', ' + (svgDim.p + 10) + ')')
    const tooltipGroups =
      $svg
      .selectAll('g.plot3TooltipContainer')
      .data(plotData)
      .enter()
      .append('g')
      .attr('class', 'plot3TooltipContainer unifiedTooltipContainer')
      .attr('data-week', (d, i) => i)
      .attr('pointer-events', 'none')
      .attr('opacity', 0);
    tooltipGroups.append('rect').attr('x', 0).attr('y', 0).attr('fill', 'white')
      .attr('stroke-width', 1)
      .attr('stroke', 'grey');
    tooltipGroups.append('text')
      .attr('x', 5)
      .attr('y', 12)
      .attr('class', 'plot3TooltipBurgerking')
      .attr('font-size', 12)
      .text('Burger King')
      .attr('font-weight', 'bold')
    tooltipGroups.append('text')
      .attr('x', 5)
      .attr('y', 24)
      .attr('class', 'plot3TooltipWendys')
      .attr('font-size', 12)
      .text('Wendy\'s')
      .attr('font-weight', 'bold')
    tooltipGroups.append('text')
      .attr('x', 5)
      .attr('y', 36)
      .attr('class', 'plot3TooltipMcdonalds')
      .attr('font-size', 12)
      .text('McDonald\'s')
      .attr('font-weight', 'bold');
    tooltipGroups.append('text')
      .attr('x', 5)
      .attr('y', 48)
      .attr('class', 'plot3TooltipWeekDates')
      .attr('font-size', 12)
      .text((d) => d.bounds.join('–'))
      .attr('font-weight', 'bold');
    tooltipGroups.each(function(d, i) {
      const tooltip = d3.select(this),
        headings = [
          tooltip.select('.plot3TooltipBurgerking'),
          tooltip.select('.plot3TooltipWendys'),
          tooltip.select('.plot3TooltipMcdonalds')
          // tooltip.select('.plot3TooltipWeekDates')
        ],
        maxHeadingWidth = d3.max(headings, (d) => d.node().getBBox().width);
      tooltip.append('text')
        .attr('x', maxHeadingWidth + 10)
        .attr('y', 12)
        .attr('font-size', 12)
        .text((d) => Math.trunc(d.wendys))
      tooltip.append('text')
        .attr('x', maxHeadingWidth + 10)
        .attr('y', 24)
        .attr('font-size', 12)
        .text((d) => Math.trunc(d.burgerking))
      tooltip.append('text')
        .attr('x', maxHeadingWidth + 10)
        .attr('y', 36)
        .attr('font-size', 12)
        .text((d) => Math.trunc(d.mcdonalds))
      const tooltipBBoxA = tooltip.node().getBBox();
      tooltip.select('rect').attr('width', tooltipBBoxA.width + 10)
      tooltip.select('rect').attr('height', tooltipBBoxA.height + 5)
      const tooltipBBoxB = tooltip.node().getBBox();
      if (!xScale(i + 2) || xScale(i + 2) + tooltipBBoxB.width > svgDim.w) {
        tooltip.attr('transform', 'translate(' + ((xScale(i + 1)) - tooltipBBoxB.width) + ', ' + yScale(d.total) + ')');
      } else {
        tooltip.attr('transform', 'translate(' + xScale(i + 2) + ', ' + yScale(d.total) + ')');
      }
      $svg
        .append('rect')
        .attr('class', 'targetRect')
        .attr('opacity', 0)
        .attr('x', xScale(i + 1))
        .attr('width', xScale.bandwidth())
        .attr('y', yScale(d.total))
        .attr('height', svgDim.h - svgDim.p - yScale(d.total))
        .attr('cursor', 'pointer')
        .on('click', () => {
          window.updatePlot1(i + 1)
        })
        .on('mouseover', () => {
          const tooltip = d3.selectAll('.unifiedTooltipContainer[data-week="' + i + '"]');
          tooltip.transition()
            .duration(200)
            .attr('display', 'block')
            .attr('opacity', 1)

        })
        .on('mouseout', () => {
          const tooltip = d3.selectAll('.unifiedTooltipContainer[data-week="' + i + '"]');
          tooltip.transition()
            .duration(200)
            .attr('opacity', 0)
            .on('end', () => {
              tooltip.attr('display', 'none')
            })
        });
    })
    tooltipGroups.select()
    window.updatePlot3 = (weekNumber) => {
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
          .attr('x1', xScale(weekNumber) + 0.5 * xScale.bandwidth())
          .attr('x2', xScale(weekNumber) + 0.5 * xScale.bandwidth())
          .attr('opacity', 1)
      }
    };
  });
})();
//brad-app.js
(() => {
  //Question 1
  var plot4 = function(filePath) {
    const data = loadData();
    data.then(function(data) {
      //How did the total fast food traffic change per neighborhood/area during
      //the course of the early COVID-19 pandemic? (heatmap with tooltips)

      //4th plot
      months_str = ['Oct 2019', 'Nov 2019', 'Dec 2019',
        'Jan 2020', 'Feb 2020', 'Mar 2020', 'Apr 2020',
        'May 2020', 'Jun 2020', 'Jul 2020', 'Aug 2020', 'Sep 2020',
        'Oct 2020'
      ]
      months = Array.from(d3.rollup(data, v => v.length, d => d.date_range_start).keys()).sort()
      cities = Array.from(d3.rollup(data, v => v.length, d => d.city).keys()).sort()

      filtered = {}
      for (let i = 0; i < data.length; i++) {
        row = data[i]
        keys = Object.keys(filtered)
        key = row.city + ',' + row.date_range_start + ',' + row.street_address
        added = 0
        for (let j = 0; j < keys.length; j++) {
          if (keys[j] == key) {
            added = 1
            break
          }
        }
        if (added == 0) {
          filtered[key] = parseInt(row.raw_visit_counts)
        }
      }

      month_city_counts = []
      for (let i = 0; i < 13; i++) {
        month_city_counts.push({})
      }

      keys = Object.keys(filtered)
      for (let i = 0; i < keys.length; i++) {
        city = keys[i].split(",")[0]
        month = keys[i].split(",")[1]
        address = keys[i].split(",")[2]
        for (let j = 0; j < months.length; j++) {
          if (months[j] == month) {
            dict = month_city_counts[j]
            current_keys = Object.keys(dict)
            added = 0
            for (let m = 0; m < current_keys.length; m++) {
              if (current_keys[m] == city) {
                month_city_counts[j][city] += filtered[keys[i]]
                added = 1
                break
              }
            }
            if (added == 0) {
              month_city_counts[j][city] = filtered[keys[i]]
            }
          }
        }
      }

      ordered_month_city_counts = []
      for (let j = 0; j < month_city_counts.length; j++) {
        dict = {}
        for (let i = 0; i < cities.length; i++) {
          city = cities[i]
          dict[city] = j > 0 ? (month_city_counts[j][city] - month_city_counts[j - 1][city]) / month_city_counts[j - 1][city] : 0
        }
        ordered_month_city_counts.push(dict)
      }
      //console.log(filtered)
      //console.log(ordered_month_city_counts)


      var margin = {
        'top': 50,
        'right': 125,
        'bottom': 50,
        'left': 125
      }
      width = 800 - margin.left - margin.right
      height = 800 - margin.top - margin.bottom

      var svg = d3.select("#plot_4").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr('viewBox', '0 0 800 800')
        .append("g")
        .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

      var xScale = d3.scaleBand().range([0, width]).domain(months_str).padding(0.01);

      svg.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(xScale))

      var yScale = d3.scaleBand().range([height, 0]).domain(cities).padding(0.01);
      svg.append("g").call(d3.axisLeft(yScale));

      // var Tooltip = d3.select('#plot_4').append('div').style('opacity', 0).attr('class', 'tooltip');

      const legendDomain = [-1, -0.5, 0, 1, 2],
      legendRange = [
        'red', '#ff9195', 'white', '#8cffa5', '#003b0d'
      ];
      var color = d3.scaleLinear().range(legendRange).domain(legendDomain)

      updated_data = []

      for (let i = 0; i < ordered_month_city_counts.length; i++) {
        dict = ordered_month_city_counts[i]
        values = Object.values(dict)
        for (let j = 0; j < values.length; j++) {
          value = values[j]
          updated_data.push(value)
        }
      }

      svg.selectAll('rect').data(updated_data).enter().append("rect")
        .attr("x", function(d, i) {
          month = months_str[Math.floor(i / 29)]
          return xScale(month)
        })
        .attr("y", function(d, i) {
          remainder = i % 29
          city = cities[remainder]
          return yScale(city)
        })
        .attr('data-entry', (d, i) => i)
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .style("fill", function(d) {
          return color(d)
        })
        .attr('stroke', 'black')
        .attr('stroke-width', 0)
        .attr('cursor', 'pointer')
        .on("mouseover", function(e, d) {
          const entry = d3.select(this).attr('data-entry');
          const tooltip = d3.select('g.plot4Tooltip[data-entry="' + entry + '"]')
          d3.select(this).transition().duration(200).attr('stroke-width', 1);
          tooltip.attr('visibility', 'visible').transition().duration(200).attr('opacity', 1);
          // Tooltip.transition().duration(100).style("opacity", 0.9);
          // Tooltip.html(d).style("left", e.pageX + "px").style("top", e.pageY + "px");
        })
        // .on("mousemove", (e, d) => {
        //   // Tooltip.transition().duration(100).style("opacity", 0.9);
        //   // Tooltip.html(d).style("left", e.pageX + "px").style("top", e.pageY + "px");
        // })
        .on("mouseout", function(e, d) {
          const entry = d3.select(this).attr('data-entry');
          const tooltip = d3.select('g.plot4Tooltip[data-entry="' + entry + '"]')
          d3.select(this).transition().duration(200).attr('stroke-width', 0);
          tooltip.transition().duration(200).attr('opacity', 0).on('end', () => tooltip.attr('visibility', 'hidden'));

          // Tooltip.transition().duration(1000).style("opacity", 0);
        });

        const $tooltips = svg.selectAll('g.plot4Tooltip')
        .data(updated_data)
        .enter()
        .append('g')
        .attr('class', 'plot4Tooltip')
        .attr('data-entry', (d, i) => i)
        .attr('opacity', 0)
        .attr('pointer-events', 'none')

        $tooltips.append('rect').attr('class', 'plot4TooltipBG');

        $tooltips.append('text').text((d) => (d > 0 ? "+" : '') + Math.trunc(d * 1000) / 10 + "%")
        .attr('x', 5).attr('y', 15).attr('font-size', 12);

        $tooltips.each(function(d, i) {
          const tooltip = d3.select(this);
          const bg = tooltip.select('rect.plot4TooltipBG')
          const bbox = tooltip.select('text').node().getBBox();
          bg.attr('width', bbox.width + 10)
          .attr('height', bbox.height + 10)
          .attr('fill', 'white')
          .attr('stroke', 'black')
          .attr('stroke-width', 1)
          const month = months_str[Math.floor(i / 29)],
          xTranslate =  xScale(month),
          remainder = i % 29,
          city = cities[remainder],
          yTranslate = yScale(city)
          if(xTranslate + xScale.bandwidth() + tooltip.node().getBBox().width > width) {
            tooltip.attr('transform', 'translate(' + (xTranslate - tooltip.node().getBBox().width) + ', ' + yTranslate + ')')
          } else {
            tooltip.attr('transform', 'translate(' + (xTranslate +  xScale.bandwidth()) + ', ' + yTranslate + ')')
          }
          tooltip.attr('visibility', 'hidden')
        });

        const legend = svg.append('g')
        .attr('id', 'plot4-legend');

        const legendBackground = legend.append('rect')
        .attr('id', 'plot4-legendBackground');

        const legendScales = legend.selectAll('g')
        .data(legendDomain.map((d, i) => [d, legendRange[i]]))
        .enter()
        .append('g');

        legendScales.append('rect')
        .attr('x', 5)
        .attr('y', (d, i) => i * 15 + 5)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', (d) => d[1])
        .attr('stroke-width', 1)
        .attr('stroke', 'black');

        legendScales.append('text')
        .attr('x', 20)
        .attr('y', (d, i) => i * 15 + 15)
        .attr('font-size', 12)
        .text((d) => d[0] * 100 + "%");

        const legendBBox = legend.node().getBBox();

        legendBackground.attr('x', 0)
        .attr('y', 0)
        .attr('width', legendBBox.width + 10)
        .attr('height', legendBBox.height + 10)
        .attr('fill', 'white')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)

        legend
        .attr('transform', 'translate(' + (width + 10) + ', 0)')

        d3.select('#plot_4').select('svg').append('text')
          .text('Visits')
          .attr('text-anchor', 'middle')
          .attr('font-weight', 'bold')
          .attr('font-size', 12)
          .attr('transform', 'translate(13, ' + 400 + ') rotate(-90)');

        d3.select('#plot_4').select('svg').append('text')
          .text('City/CDP')
          .attr('text-anchor', 'middle')
          .attr('font-weight', 'bold')
          .attr('font-size', 12)
          .attr('transform', 'translate(' + 400 + ',' + (800 - margin.bottom / 2 + 10) + ')');

        d3.select('#plot_4').select('svg').append('text')
          .text('Change in Fast Food Traffic by City/CDP By Month')
          .attr('text-anchor', 'middle')
          .attr('font-size', 20)
          .attr('transform', 'translate(' + 400 + ', 25)');

    })
  };
  var filePath = "Cleaned.csv";
  plot4(filePath);
})();
//ari-plot5.js
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
        //console.log(monthGroup.node())
        monthGroup.select('.iqrRect')
          .transition()
          .duration(200)
          .attr('x', xScale(d[0]) + 0.05 * xScale.bandwidth())
          .attr('width', xScale.bandwidth() * 0.9)
          .attr('y', yScale(d[1].q3))
          .attr('height', yScale(d[1].q1) - yScale(d[1].q3))
          .attr('class', 'iqrRect color-' + restaurant.replace(' ', '').replace("'", '').toLowerCase())
        //console.log(monthGroup.select('.iqrRect').attr('y'))

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
//pranav-app.js
(() => {
  function charts() {
    // boxPlotDataFilter();
    bubbleMapFilter();
  }

  // function boxPlotDataFilter() {
  //   d3.csv("Cleaned.csv").then(function(data1) {
  //     // console.log("786 data", data1);
  //     let data = [],
  //       min = 0,
  //       max = 0;
  //     data1.forEach((d, i) => {
  //       if (d.location_name.localeCompare("McDonald's") == 0) {
  //         d.visits_by_day = parseFloat(d.visits_by_day);
  //         data.push(d.visits_by_day);
  //       }
  //     });
  //
  //     data.sort();
  //     min = data[0];
  //     max = data[data.length - 1];
  //
  //     // console.log("786 data", data, min, max);
  //
  //     boxPlot(data);
  //
  //     d3.select("#McDonald").on("change", function(i, d) {
  //       if (this.checked) {
  //         let value = document.getElementById("McDonald").value;
  //         data = [];
  //         data1.forEach((d, i) => {
  //           if (d.location_name.localeCompare("McDonald's") == 0) {
  //             d.visits_by_day = parseFloat(d.visits_by_day);
  //             data.push(d.visits_by_day);
  //           }
  //         });
  //
  //         data.sort();
  //         min = data[0];
  //         max = data[data.length - 1];
  //         boxPlot(data);
  //       }
  //     });
  //
  //     d3.select("#Wendy").on("change", function(i, d) {
  //       if (this.checked) {
  //         let value = document.getElementById("Wendy").value;
  //         data = [];
  //         data1.forEach((d, i) => {
  //           if (d.location_name.localeCompare("Wendy's") == 0) {
  //             d.visits_by_day = parseFloat(d.visits_by_day);
  //             data.push(d.visits_by_day);
  //           }
  //         });
  //
  //         data.sort();
  //         min = data[0];
  //         max = data[data.length - 1];
  //         boxPlot(data);
  //       }
  //     });
  //
  //     d3.select("#BurgerKing").on("change", function(i, d) {
  //       if (this.checked) {
  //
  //         let value = document.getElementById("BurgerKing").value;
  //         data = [];
  //         data1.forEach((d, i) => {
  //           if (d.location_name.localeCompare("Burger King") == 0) {
  //             d.visits_by_day = parseFloat(d.visits_by_day);
  //             data.push(d.visits_by_day);
  //           }
  //         });
  //
  //         data.sort();
  //         min = data[0];
  //         max = data[data.length - 1];
  //         boxPlot(data);
  //       }
  //     });
  //   });
  // }
  //
  // function boxPlot(data) {
  //   d3.select("#boxplot svg").remove();
  //   var margin = {
  //       top: 10,
  //       right: 30,
  //       bottom: 30,
  //       left: 75
  //     },
  //     width = 400 - margin.left - margin.right,
  //     height = 400 - margin.top - margin.bottom;
  //
  //   var svg = d3
  //     .select("#boxplot")
  //     .append("svg")
  //     .attr("width", width + margin.left + margin.right)
  //     .attr("height", height + margin.top + margin.bottom)
  //     .append("g")
  //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  //
  //   var data_sorted = data;
  //
  //   var q1 = d3.quantile(data_sorted, 0.25);
  //   var median = d3.quantile(data_sorted, 0.5);
  //   var q3 = d3.quantile(data_sorted, 0.75);
  //   var interQuantileRange = q3 - q1;
  //   var min = q1 - 1.5 * interQuantileRange;
  //   var max = q1 + 1.5 * interQuantileRange;
  //
  //   var y = d3
  //     .scaleLinear()
  //     .domain([min - 11, max + 11])
  //     .range([height, 0]);
  //   svg.call(d3.axisLeft(y));
  //
  //   svg
  //     .append("text")
  //     .attr("transform", "rotate(-90)")
  //     .attr("y", 0 - margin.left)
  //     .attr("x", 0 - height / 2)
  //     .attr("dy", "1em")
  //     .style("text-anchor", "middle")
  //     .style("stroke", "black")
  //     .style("font-size", "15px")
  //     .text("Visits per Day");
  //
  //   var center = 200;
  //   var width = 100;
  //
  //   svg
  //     .append("line")
  //     .attr("x1", center)
  //     .attr("x2", center)
  //     .attr("y1", y(min))
  //     .attr("y2", y(max))
  //     .attr("stroke", "black");
  //
  //   svg
  //     .append("rect")
  //     .attr("x", center - width / 2)
  //     .attr("y", y(q3))
  //     .attr("height", y(q1) - y(q3))
  //     .attr("width", width)
  //     .attr("stroke", "black")
  //     .style("fill", "#69b3a2");
  //
  //   svg
  //     .selectAll("toto")
  //     .data([min, median, max])
  //     .enter()
  //     .append("line")
  //     .attr("x1", center - width / 2)
  //     .attr("x2", center + width / 2)
  //     .attr("y1", function(d) {
  //       return y(d);
  //     })
  //     .attr("y2", function(d) {
  //       return y(d);
  //     })
  //     .attr("stroke", "black");
  // }

  function bubbleMapFilter() {
    bubbleMap("McDonald's");
    d3.select("#McDonald_sandiego").on("change", function(i, d) {
      bubbleMap("McDonald's");
    });

    d3.select("#Wendy_sandiego").on("change", function(i, d) {
      if (this.checked) {
        bubbleMap("Wendy's");
      }
    });

    d3.select("#BurgerKing_sandiego").on("change", function(i, d) {
      if (this.checked) {
        bubbleMap("Burger King");
      }
    });
  }

  function bubbleMap(restaurant) {
    d3.select("#map svg").remove();
    d3.select("#mapdiv").remove();
    var margin = {
        top: 10,
        right: 30,
        bottom: 30,
        left: 40
      },
      width = 1000 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    var svg = d3
      .select("#map")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("id", "mapg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var tooltip = d3
      .select("#map")
      .append("div")
      .attr("width", 11)
      .attr("height", 11)
      .attr("class", "tooltips")
      .style("visibility", "hidden");

    d3.json("map.geojson").then(function(us) {
      d3.csv("Cleaned.csv").then(function(data) {
        const projection = d3.geoAlbersUsa().fitSize([width, height], us);

        data = d3.flatGroup(data
          .filter((d) => d.location_name.localeCompare(restaurant) == 0), (d) =>
          d.street_address
        ).map((d) => ({
          "location_name": d[1][0].location_name,
          "street_address": d[0],
          "longitude": d[1][0].longitude,
          "latitude": d[1][0].latitude,
          "city": d[1][0].city,
          "raw_visit_counts": d3.mean(d[1], (r) => r.visits_by_day),
          "raw_visitor_counts": d3.mean(d[1], (r) => r.visits_by_day)

        }));

        //console.log(data);

        let data1 = [];
        let min = 0,
          max = 0;
        data.forEach((d, i) => {
          // if (i == 0) {
          //   console.log("786 d", d);
          // }

          if (d.city.localeCompare("San Diego") == 0) {
            data1.push(d);
            d.raw_visit_counts = d.raw_visit_counts;
            d.raw_visitor_counts = d.raw_visitor_counts;

            if (d.raw_visit_counts < min) {
              min = d.raw_visitor_counts;
            }

            if (d.raw_visit_counts > max) {
              max = d.raw_visitor_counts;
            }
          }
        });

        data = data1;
        var color = d3
          .scaleOrdinal()
          .domain(["Burger King", "Wendy's", "McDonald's"])
          .range(["#000e8a", "#D18975", "#ba0900"]);

        const size = d3.scaleLinear().domain([min, max]).range([3, 16]);

        const sdPath = svg
          .append("g")
          .attr('id', 'plot6-sdPath')

        sdPath.selectAll("path")
          .data(us.features)
          .join("path")
          .attr("d", d3.geoPath().projection(projection))
          .attr("fill", "green")
          .attr("stroke", "black")
          .attr("fill-opacity", 0.21);

        sdPath.selectAll('path')
          .each(function(d, i) {
            if (this.getBBox().x > 600) {
              d3.select(this).remove()
            }
          });
        const sdPathBBox = sdPath.node().getBBox();
        svg.append('text')
          .attr('x', sdPathBBox.x + sdPathBBox.width)
          .attr('y', 10)
          .text("San Diego City Borders")

        svg
          .selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr('cursor', 'pointer')
          .attr("cx", function(d) {
            return projection([
              parseFloat(d.longitude),
              parseFloat(d.latitude),
            ])[0];
          })
          .attr("cy", function(d) {
            return projection([
              parseFloat(d.longitude),
              parseFloat(d.latitude),
            ])[1];
          })
          .attr("r", function(d) {
            return size(d.raw_visitor_counts);
          })
          .style("fill", function(d) {
            return color(d.location_name);
          })
          .attr("opacity", 0.8)
          // .attr("stroke", function(d) {
          //   return color(d.location_name);
          // })
          // .attr("stroke-width", 3)
          .on("mouseover", function(i, d) {
            d3.select(this).transition()
              .duration(200)
              .attr('opacity', 1)
            tooltip.html(
              `Address: ${d.street_address} <br> Average daily visitors : ${Math.trunc(d.raw_visit_counts)}`
            );
            tooltip.style("visibility", "visible");

            // tooltip
            //   .style("top", event.pageY + "px")
            //   .style("left", event.pageX + "px");
          })
          .on("mouseout", function() {
            d3.select(this).transition()
              .duration(200)
              .attr('opacity', 0.8)
            tooltip.style("visibility", "hidden");
          });
      });
    });
  }

  charts();
})();
});
