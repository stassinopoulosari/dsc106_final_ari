(() => {
  //Question 1
  var plot4 = function(filePath) {
    const data = d3.csv(filePath)
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
      console.log(filtered)
      console.log(ordered_month_city_counts)


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
  var filePath = "./data/Cleaned.csv";
  plot4(filePath);
})();
