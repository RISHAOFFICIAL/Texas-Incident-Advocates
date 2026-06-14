const payload = {
  incidentType: "spill",
  role: "landowner",
  severity: "property",
  defendant: "Energy Transfer Partners",
  legalStatus: "no",
  firstName: "Jane",
  lastName: "Ranchowner",
  email: "jane@ranchland.com",
  phone: "432-555-0199",
  county: "Midland County",
  state: "TX",
  details: "A major produced water leak has sterilized about 5 acres of our pasture land.",
  latitude: "31.99123",
  longitude: "-102.07456",
  commodity: "Produced Water (Saltwater)",
  operator: "Energy Transfer Partners",
  parcelId: "R000045231",
  landownerName: "Wade Ranch Properties LLC"
};

fetch('http://localhost:3000/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(async res => {
  console.log('Response Status:', res.status);
  const data = await res.json();
  console.log('Submission Response JSON:', data);
})
.catch(err => {
  console.error('Submission Error:', err);
});
