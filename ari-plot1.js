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
