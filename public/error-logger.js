window.addEventListener('error', function(e) {
  fetch('http://localhost:8081/__log_error', {
    method: 'POST',
    body: e.error ? e.error.stack : e.message
  });
});
