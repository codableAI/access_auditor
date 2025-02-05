<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dashboard</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="fade-in">
  <%- include('partials/header') %>
  <div class="container">
    <h2>Dashboard</h2>
    <h3>Logs in the Last 7 Days</h3>
    <canvas id="logChart"></canvas>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      const ctx = document.getElementById('logChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: <%= logChartLabels %>,
          datasets: [{
            label: 'Number of Logs',
            data: <%= logChartData %>,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            fill: true
          }]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });
    </script>
    <h3>Recent Audits</h3>
    <table>
      <tr>
        <th>ID</th>
        <th>Scheduled At</th>
        <th>Executed At</th>
        <th>Status</th>
        <th>Analysis</th>
      </tr>
      <% audits.forEach(function(audit){ %>
        <tr>
          <td><%= audit.id %></td>
          <td><%= audit.scheduledAt ? new Date(audit.scheduledAt).toISOString() : '' %></td>
          <td><%= audit.executedAt ? new Date(audit.executedAt).toISOString() : 'Pending' %></td>
          <td><%= audit.status %></td>
          <td><%= audit.analysis ? audit.analysis.substring(0, 100) + '...' : '' %></td>
        </tr>
      <% }) %>
    </table>
  </div>
  <%- include('partials/footer') %>
</body>
</html>
