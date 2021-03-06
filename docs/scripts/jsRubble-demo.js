/*

  jsRubble Physics Engine - Demonstration App

  Source repository (at time of writing):
  https://github.com/tommccracken/jsRubble


  Copyright 2017 Thomas O. McCracken

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

// The HTML5 canvas element
var canvas = document.getElementById("SketchCanvas");
// Create a graphics context
var ctx = canvas.getContext("2d");
// Target update rate in Hz
var physics_frequency = 50;
// Associated physics update period
var physics_period = 1 / physics_frequency;
// Rendering scaling variables
var draw_size;
var draw_scaling_factor;
var debug_mode = false;
// The physics world
var physics_world;
// The world size
var world_size;
// Declare loop timing variables
var time_now;
var time_prev;
var delta;
var paused;
// Used to debounce resize calculations
var debounce;
// Variables used for enabling pointer based user interactions
var pointer_x = 0;
var pointer_y = 0;
var pointer_state = 0;
var pointer_interaction_radius = 0;
var pointer_point_constraint = null;

function draw_world() {
  // Clear the scene
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw border
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.stroke();
  // Draw the constraints
  for (var count = 0; count < physics_world.constraints.length; count++) {
    // Draw distance constraints
    if (physics_world.constraints[count] instanceof DistanceConstraint) {
      if (!(physics_world.constraints[count] instanceof ParticleContactConstraint) || debug_mode) {
        ctx.beginPath();
        ctx.moveTo(physics_world.constraints[count].p1.pos.x * draw_scaling_factor, world_size * draw_scaling_factor - physics_world.constraints[count].p1.pos.y * draw_scaling_factor);
        ctx.lineTo(physics_world.constraints[count].p2.pos.x * draw_scaling_factor, world_size * draw_scaling_factor - physics_world.constraints[count].p2.pos.y * draw_scaling_factor);
        ctx.strokeStyle = 'rgba(33,33,220,1)';
        ctx.stroke();
      }
    }
    /* Not used yet - //Draw angle constraints
    if (physics_world.constraints[count] instanceof AngleConstraint) {
      ctx.beginPath();
      ctx.arc(physics_world.constraints[count].p_anchor.pos.x * draw_scaling_factor, world_size * draw_scaling_factor - physics_world.constraints[count].p_anchor.pos.y * draw_scaling_factor, (physics_world.constraints[count].p_anchor.radius*1.35) * draw_scaling_factor, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(255,0,0,0.3)';
      ctx.fill();
    }
    */
  }
  // Draw the particles
  for (var count = 0; count < physics_world.particles.length; count++) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(53,53,53,1)';
    ctx.arc(physics_world.particles[count].pos.x * draw_scaling_factor, world_size * draw_scaling_factor - physics_world.particles[count].pos.y * draw_scaling_factor, physics_world.particles[count].radius * draw_scaling_factor, 0, 2 * Math.PI, false);
    if (physics_world.particles[count].fixed === true) {
      ctx.fillStyle = 'rgba(255,155,33,0.5)';
    } else if (physics_world.particles[count].SPH_particle) {
      ctx.fillStyle = 'rgba(33,220,33,0.1)';
    } else {
      ctx.fillStyle = 'rgba(33,220,33,0.5)';
    }
    ctx.fill();
    ctx.stroke();
    if (debug_mode) {
      ctx.fillStyle = 'rgba(53,53,53,1)';
      ctx.font = draw_size * 0.03 + 'px ariel';
      ctx.fillText(count, physics_world.particles[count].pos.x * draw_scaling_factor - 4, world_size * draw_scaling_factor - physics_world.particles[count].pos.y * draw_scaling_factor + 3);
    }
  }
  // Draw debug information
  if (debug_mode) {
    ctx.font = draw_size * 0.03 + 'px ariel';
    ctx.fillStyle = 'black';
    ctx.fillText("Physics steps: " + physics_world.steps + ", Physics time: " + physics_world.time.toFixed(3) + "s, Physics dt: " + physics_world.time_step.toFixed(3) + "s", 7, 16);
    ctx.fillText("Number of particles: " + physics_world.particles.length + ", Number of constraints: " + physics_world.constraints.length, 7, 16 + draw_size * 0.04);
    if (physics_world.SPH_spatial_partitioning == 1) { // Draw the grid
      for (var i = 0; i < this.physics_world.SPH_grid.grid_count_x; i++) {
        for (var j = 0; j < this.physics_world.SPH_grid.grid_count_y; j++) {
          ctx.beginPath();
          ctx.moveTo(i * this.physics_world.SPH_grid.grid_size * draw_scaling_factor, world_size * draw_scaling_factor - j * this.physics_world.SPH_grid.grid_size * draw_scaling_factor - this.physics_world.SPH_grid.grid_size * draw_scaling_factor);
          ctx.rect(i * this.physics_world.SPH_grid.grid_size * draw_scaling_factor, world_size * draw_scaling_factor - j * this.physics_world.SPH_grid.grid_size * draw_scaling_factor - this.physics_world.SPH_grid.grid_size * draw_scaling_factor, this.physics_world.SPH_grid.grid_size * draw_scaling_factor, this.physics_world.SPH_grid.grid_size * draw_scaling_factor);
          if (physics_world.SPH_grid.elements[i][j].size == 0) {
            ctx.fillStyle = 'rgba(53,53,53,0.2)';
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(53,53,53,1)';
          ctx.stroke();
        }
      }
    } else if (physics_world.SPH_spatial_partitioning > 1) { // Draw the spatial hash
      for (var i = 0; i < this.physics_world.SPH_grid.get_size(); i++) {
        ctx.beginPath();
        var coordinates = Object.keys(this.physics_world.SPH_grid.spatial_hash)[i].split(",");
        var x = parseInt(coordinates[0]);
        var y = parseInt(coordinates[1]);
        ctx.moveTo(x * this.physics_world.SPH_grid.bin_size * draw_scaling_factor, world_size * draw_scaling_factor - y * this.physics_world.SPH_grid.bin_size * draw_scaling_factor - this.physics_world.SPH_grid.bin_size * draw_scaling_factor);
        ctx.rect(x * this.physics_world.SPH_grid.bin_size * draw_scaling_factor, world_size * draw_scaling_factor - y * this.physics_world.SPH_grid.bin_size * draw_scaling_factor - this.physics_world.SPH_grid.bin_size * draw_scaling_factor, this.physics_world.SPH_grid.bin_size * draw_scaling_factor, this.physics_world.SPH_grid.bin_size * draw_scaling_factor);
        ctx.strokeStyle = 'rgba(53,53,53,1)';
        ctx.stroke();
      }
    }
  }
}

function app_loop() {
  if (!paused) {
    draw_world();
    time_now = get_time();
    delta = delta + (time_now - time_prev);
    while (delta > (physics_period * 1000)) {
      delta = delta - (physics_period * 1000);
      physics_world.update();
    }
    time_prev = get_time();
    window.requestAnimationFrame(app_loop);
  }
}

function resize_canvas() {
  // Resize the canvas element to suit the current viewport size/shape
  var viewport_width = $(window).width();
  var viewport_height = $(window).height();
  draw_size = Math.round(0.80 * Math.min(viewport_width, 0.85 * viewport_height));
  ctx.canvas.height = draw_size;
  ctx.canvas.width = draw_size;
  $('#max-width-box').width(draw_size);
  // Recalculate the draw scaling factor
  draw_scaling_factor = draw_size / world_size;
  // Draw the world
  draw_world();
}

function initialise() {
  // Load the currently selected scene
  scenes[$("#scene_list").prop('selectedIndex')][1].call();
  // Resize the canvas
  resize_canvas();
  // Set interaction radius of pointer 
  pointer_interaction_radius = 0.1 * physics_world.width;
  // Draw the world
  draw_world();
  // Initialise the loop timing variables
  time_now = get_time();
  time_prev = get_time();
  delta = 0;
  // Start the loop
  window.requestAnimationFrame(app_loop);
}

$('#scene_list').on('change', function () {
  // Reinitialise if a different scene has been selected. Give the garbage collector an opportunity to clear scenes with large numbers of world elements.
  var pause_state = paused;
  if (!paused) {
    paused = true;
  }
  setTimeout(function () { initialise(); paused = pause_state; }, 100);
});

$('#ResumePause').on('click', function (e) {
  if (paused) {
    paused = false;
    $('#ResumePause').text('Pause');
    $("#Step").addClass("disabled");
    time_now = get_time();
    time_prev = get_time();
    window.requestAnimationFrame(app_loop);
  } else {
    paused = true;
    $('#ResumePause').text('Resume');
    $('#Step').removeClass("disabled");
  }
  draw_world();
});

$('#Step').on('click', function (e) {
  physics_world.update();
  draw_world();
});

$('#Reset').on('click', function (e) {
  // Reinitialise. Give the garbage collector an opportunity to clear scenes with large numbers of world elements.
  var pause_state = paused;
  if (!paused) {
    paused = true;
  }
  setTimeout(function () { initialise(); paused = pause_state; }, 100);
});

$(window).resize(function () {
  clearTimeout(debounce);
  debounce = setTimeout(function () {
    resize_canvas();
  }, 50);
});

$(document).ready(function () {
  // Populate the scenes select list with the available scenes
  populate_select_list();
  // Set the initial state of debug_mode to false
  $('#debug_checkbox').prop('checked', false);
  debug_mode = false;
  // Ensure the width of the "Resume/Pause" button is consistent
  paused = false;
  var button_width = $('#ResumePause').width();
  $('#ResumePause').text('Pause');
  $('#ResumePause').width(button_width);
  // Initialise the scene
  initialise();
});

function populate_select_list() {
  for (var count = 0; count < scenes.length; count++) {
    //scene = scenes[count]
    $('#scene_list').append($('<option>', {
      value: scenes[count],
      text: scenes[count][0]
    }));
  }
  $("#scene_list").prop('selectedIndex', 0);
}

$('#debug_checkbox').change(function () {
  debug_mode = $(this).prop('checked');
  if (paused) {
    draw_world();
  }
});

// Prevent page elements from being inadvertently selected on the Edge browser.
document.getElementById("SketchCanvas").onselectstart = function () { return false; }

// Add event listeners to handle user pointer interactions. Using separate mouse and touch events (rather than unified pointer events) for browser compatibility.

document.getElementById("SketchCanvas").addEventListener("mousedown", function (ev) {
  pointer_x = (ev.pageX - ev.target.offsetLeft) / draw_scaling_factor;
  pointer_y = world_size - (ev.pageY - ev.target.offsetTop) / draw_scaling_factor;
  start_drag();
}, false);

document.getElementById("SketchCanvas").addEventListener("touchstart", function (ev) {
  pointer_x = (ev.touches[0].pageX - ev.touches[0].target.offsetLeft) / draw_scaling_factor;
  pointer_y = world_size - (ev.touches[0].pageY - ev.touches[0].target.offsetTop) / draw_scaling_factor;
  start_drag();
}, false);

document.getElementById("SketchCanvas").addEventListener("mouseup", function (ev) {
  stop_drag()
}, false);

document.getElementById("SketchCanvas").addEventListener("touchend", function (ev) {
  stop_drag()
}, false);

document.getElementById("SketchCanvas").addEventListener("mousemove", function (ev) {
  pointer_x = (ev.pageX - ev.target.offsetLeft) / draw_scaling_factor;
  pointer_y = world_size - (ev.pageY - ev.target.offsetTop) / draw_scaling_factor;
  pointer_move();
}, false);

document.getElementById("SketchCanvas").addEventListener("touchmove", function (ev) {
  ev.preventDefault(); // Stop unintended scrolling on some browsers
  pointer_x = (ev.touches[0].pageX - ev.touches[0].target.offsetLeft) / draw_scaling_factor;
  pointer_y = world_size - (ev.touches[0].pageY - ev.touches[0].target.offsetTop) / draw_scaling_factor;
  pointer_move();
}, false);

document.getElementById("SketchCanvas").addEventListener("mouseleave", function (ev) {
  stop_drag();
}, false);

function start_drag() {
  pointer_state = 1;
  var near_list = [];
  for (var i = 0; i < physics_world.particles.length; i++) {
    var dist_apart = physics_world.particles[i].pos.subtract(new Vector2(pointer_x, pointer_y));
    if (dist_apart.magnitude() < pointer_interaction_radius) {
      near_list.push(physics_world.particles[i]);
    }
  }
  // Sort any particles within the pointer interaction radius by the distance to the pointer location in order to find the nearest particle https://en.wikipedia.org/wiki/Insertion_sort
  var i = 1;
  while (i < near_list.length) {
    var j = i;
    while ((j > 0) && (near_list[j - 1].pos.subtract(new Vector2(pointer_x, pointer_y)).magnitude() > near_list[j].pos.subtract(new Vector2(pointer_x, pointer_y)).magnitude())) {
      var b = near_list[j];
      near_list[j] = near_list[j - 1];
      near_list[j - 1] = b;
      j = j - 1;
    }
    i = i + 1;
  }
  if (near_list.length > 0) {
    physics_world.create_point_constraint(near_list[0], pointer_x, pointer_y, 0.6);
    pointer_point_constraint = physics_world.constraints[physics_world.constraints.length - 1];
  }
}

function stop_drag() {
  pointer_state = 0;
  if (pointer_point_constraint !== null) {
    physics_world.delete_constraint_by_reference(pointer_point_constraint);
    pointer_point_constraint = null;
  }
}

function pointer_move() {
  if ((pointer_x < 0) || (pointer_x > world_size) || (pointer_y < 0) || (pointer_y > world_size)) {
    pointer_state = 0;
    stop_drag();
  } else {
    if (pointer_point_constraint !== null) {
      pointer_point_constraint.anchor.x = pointer_x;
      pointer_point_constraint.anchor.y = pointer_y;
    }
  }
}