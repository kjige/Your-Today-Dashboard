$(document).ready(function() {

    // Firebase Set-Up ---->
    // Configure and initialize Firebase.
    var config = {
        apiKey: "AIzaSyDCO42TtlK2h-MzIpVt1qGGQR-AmpwQVS0",
        authDomain: "your-today-dashboard.firebaseapp.com",
        databaseURL: "https://your-today-dashboard.firebaseio.com",
        storageBucket: "your-today-dashboard.appspot.com",
        messagingSenderId: "840765761710"
    };
    firebase.initializeApp(config);

    // Assign the Firebase database to a variable.
    var database = firebase.database();

    // Assign sub-level of the databse to variables.
    var users = database.ref('users');
    var displayNames = database.ref('displayNames');
    var locations = database.ref('locations');

    // Assign authentication tools to variables.
    var auth = firebase.auth();
    // <---- Firebase Set-Up



    // Initialize variables --->
    var email = $('#email').val();
    var password = $('#password').val();
    var name;
    var displayName;
    var location;
    var lat;
    var long;
    // <--- Initialize variables.


    // Authentication ---->
    // On login-button click..
    $('#login-button').on('click', function(e) {

        // Get email & stuff.
        email = $('#email').val();
        password = $('#password').val();

        // Promise attempts to sign in.
        var promise = auth.signInWithEmailAndPassword(email, password);

        // If it fails, log the error message.
        promise.catch(function(e) {
            console.log(e.message);
        });

        // Don't refresh.
        return false;
    });

    // On logout-button click.
    $('#logout-button').on('click', function() {
        // Sign out.
        auth.signOut();

        // Hide/show buttons.
        $('.login-form').show();
        $('#logout-button').addClass('hide');
        $('#login-button').show();
        $('.welcome').hide();
        $('.change').hide();
    });

    // Realtime authentication state listener.
    auth.onAuthStateChanged(function(firebaseUser) {
        if (firebaseUser) {
            // Log that you are logged in.
            console.log("You are logged in as: ", firebaseUser);
            // Do successful log-in stuff.
            afterLogIn(firebaseUser);
        } else {
            // Log that you are not logged in.
            console.log("you are NOT logged in");
        }
    });

    // What to do when authentication is successful.
    afterLogIn = function(firebaseUser) {
        // Hide/show buttons.
        $('.login-form').hide();
        $('#email').val('');
        $('#password').val('');
        $('#login-button').hide();
        $('#logout-button').removeClass('hide');
        name = firebaseUser.email.split('@')[0];

        // Check whether you need to show the form.
        $.when(isUserInfoNeeded()).done(showForm);
    };
    // <---- Authentication


    // Check whether we have the form inputs already.
    isUserInfoNeeded = function() {

        // Check if a display name is already known for this email.
        displayNames.child(name).once('value', function(snapshot) {
            if (snapshot.exists()) {
                displayName = snapshot.val().displayName;
                $('#displayName').val(displayName);
            }
        });

        // Check if a location is already known for this email.
        return locations.child(name).once('value', function(snapshot) {
            if (snapshot.exists()) {
                location = snapshot.val().location;
                $('#location').val(location);
            }
        });
    };

    // If we found that we have a display name and location already, hide the form.
    showForm = function() {
        if (displayName === undefined || location === undefined) {
            $('.form').show();
        } else {
            $('.welcome').show();
            $('.change').show();
        }
    };

    $('#change-button').on('click', function() {
        $('.form').show();
        $('.welcome').hide();
        $('.change').hide();
    });

    // Get location from 'Auto-Locate' button.
    $('#auto-locate').on('click', function() {
        if (navigator.geolocation) {
            // Hand the results to savePosition.
            navigator.geolocation.getCurrentPosition(savePosition, positionError);
        } else {
            // Very basic error handling for now. Indicates browser incompatibility.
            console.log('Geolocation not possible.');
        }

        // Don't refresh.
        return false;
    });

    // If auto-locate is successful, write it to the location input..
    savePosition = function(position) {
        lat = position.coords.latitude;
        long = position.coords.longitude;

        // Write the truncated coordinates to the location input.
        $('#location').val(lat.toFixed(3) + ',' + long.toFixed(3));
    };

    // If auto-locate fails, display error text.
    positionError = function() {
        $('#form-submit-message').text('Error getting address.');
    };


    // When the form is submitted with the display name and location,
    $('#submit-button').on('click', function() {
        // Get contents of displayName input.
        displayName = $('#displayName').val();

        // Verify that a name was input before sending it to Firebase.
        if (displayName.length > 0) {
            var displayNameObj = {};
            displayNameObj[name] = {
                displayName: displayName
            };
            displayNames.update(displayNameObj);
        }

        // Get contents of location input.
        location = $('#location').val();

        // Verify that a location was input before geocoding & sending it to Firebase.
        if (location.length > 0) {
            // Initialize geocoder.
            var geocoder = new google.maps.Geocoder();

            // Geocode location input.
            geocoder.geocode({
                'address': location
            }, function(results, status) {
                // If geocoding was successful,
                if (status == google.maps.GeocoderStatus.OK) {
                    // Save latitude and longitude.
                    lat = results[0].geometry.location.lat();
                    long = results[0].geometry.location.lng();
                    locationName = results[0].formatted_address;

                    // Write location and lat/long to Firebase.            
                    var locationObj = {};
                    locationObj[name] = {
                        location: location,
                        locationName: locationName,
                        lat: lat,
                        long: long
                    };
                    locations.update(locationObj);

                    // Hide form and show change button only if geocoding was successful.
                    $('.form').hide();
                    $('.welcome').show();
                    $('.change').show();

                    // Display success message.
                    console.log('Name and location set!');

                } else {
                    // Display a basic error code. Need better handling but this works for now.
                    console.log("Geocode was not successful for the following reason: " + status);
                }
            });
        }

        return false;
    });


    // Listen for changes in name once logged in.
    displayNames.on('value', function(snapshot) {
        if (name !== undefined) {
            displayName = snapshot.child(name).val().displayName;
            $('#hello').text('Hello ' + displayName + '!');
        }
    });


    // Listen for changes in location once logged in.
    locations.on('value', function(snapshot) {
        if (location !== undefined) {
            lat = snapshot.child(name).val().lat;
            long = snapshot.child(name).val().long;
            locationName = snapshot.child(name).val().locationName;
        }
    });

    // Fetch weather.
    $('#weather-button').on('click', function() {
        var apiKey = '0b3cbdf73e99584a55eddd1b6bd851f6';
        var url = 'https://api.forecast.io/forecast/';

        $.getJSON(url + apiKey + "/" + lat + "," + long + "?callback=?", function(data) {
            // console.log(data);
            $('#weatherLocation').html('The weather for ' + locationName);
            $('#weather').html('The temperature: ' + data.currently.temperature + ' degrees');
            $('#summary').html(data.currently.summary);
        });
        //https://api.forecast.io/forecast/0b3cbdf73e99584a55eddd1b6bd851f6

        return false;

    });

});
