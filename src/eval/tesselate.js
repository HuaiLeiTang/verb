

//
// ####tesselate_rational_surface_naive( degree_u, knots_u, degree_v, knots_v, homo_control_points, divs_u, divs_v )
//
// Tesselate a nurbs surface
//
// **params**
// + *Number*, integer degree of surface in u direction
// + *Array*, array of nondecreasing knot values in u direction
// + *Number*, integer degree of surface in v direction
// + *Array*, array of nondecreasing knot values in v direction
// + *Array*, 3d array of control points, top to bottom is increasing u direction, left to right is increasing v direction,
// and where each control point is an array of length (dim+1)
// 
// **returns** 
// + *Array*, first element of array is an array of positions, second element are 3-tuple of triangle windings, third element is the 
                  // uvs

verb.eval.nurbs.tesselate_rational_surface_naive = function( degree_u, knots_u, degree_v, knots_v, homo_control_points, divs_u, divs_v ) {

	if ( divs_u < 1 ) {
		divs_u = 1;
	}

	if ( divs_v < 1 ) {
		divs_v = 1;
	}

	var span_u = 1 / divs_u,
		span_v = 1 / divs_v;
  
  var points = [];
  var uvs = [];
  var normals = [];

	for (var i = 0; i < divs_u + 1; i++) {
		for (var j = 0; j < divs_v + 1; j++) {

			var pt_u = i * span_u, 
				pt_v = j * span_v;

			uvs.push( [pt_u, pt_v] );

			var derivs = verb.eval.nurbs.rational_surface_derivs( degree_u, knots_u, degree_v, knots_v, homo_control_points, 1, pt_u, pt_v );
			var pt = derivs[0][0];

			points.push( pt );

			var normal = numeric.cross(  derivs[0][1], derivs[1][0] );
			normals.push( normal );

		}
	}

  	var faces = [];

	for (var i = 0; i < divs_u ; i++) {
		for (var j = 0; j < divs_v ; j++) {

			var a_i = i * (divs_v + 1) + j,
				b_i = (i + 1) * (divs_v + 1) + j,
				c_i = b_i + 1,
				d_i = a_i + 1,
				abc = [a_i, b_i, c_i],
				acd = [a_i, c_i, d_i];

			faces.push(abc);
			faces.push(acd);

		}
	}

	return { points: points, faces : faces, uvs: uvs, normals: normals };

}



//
// ####rational_curve_regular_sample( degree, knots, control_points, num_samples [, include_u] )
//
// Sample a NURBS curve assuming parameterization 0 to 1, corresponds to http://ariel.chronotext.org/dd/defigueiredo93adaptive.pdf
//
// **params**
// + *Number*, integer degree
// + *Array*, array of nondecreasing knot values 
// + *Array*, 1d array of homogeneous control points, where each control point is an array of length (dim+1) and form (wi*pi, wi) 
// + *Number*, integer number of samples
// 
// **returns** 
// + *Array*, an array of points, prepended by the point param
//

verb.eval.nurbs.rational_curve_regular_sample = function( degree, knots, control_points, num_samples, include_u ) {

	return verb.eval.nurbs.rational_curve_regular_sample_range( degree, knots, control_points, 0, 1.0, num_samples, include_u);

}

//
// ####rational_curve_regular_sample_range( degree, knots, control_points, start_u, end_u, num_samples, include_u )
//
// Sample a NURBS curve assuming parameterization 0 to 1, corresponds to http://ariel.chronotext.org/dd/defigueiredo93adaptive.pdf
//
// **params**
// + *Number*, integer degree
// + *Array*, array of nondecreasing knot values 
// + *Array*, 1d array of homogeneous control points, where each control point is an array of length (dim+1) and form (wi*pi, wi) 
// + *Number*, start parameter for sampling
// + *Number*, end parameter for sampling
// + *Number*, integer number of samples
// + *Boolean*, whether to prefix the point with the parameter
// 
// **returns** 
// + *Array*, an dictionary of parameter - point pairs
//

verb.eval.nurbs.rational_curve_regular_sample_range = function( degree, knots, control_points, start_u, end_u, num_samples, include_u ) {

	if (num_samples < 1){
		num_samples = 2;
	}

	var p = [],
		span = (end_u - start_u) / (num_samples - 1),
		u = 0;

	for (var i = 0; i < num_samples; i++){

		u = start_u + span * i;
		if ( include_u ){
			p.push( [u].concat( verb.eval.nurbs.rational_curve_point(degree, knots, control_points, u) ) );
		} else {
			p.push( verb.eval.nurbs.rational_curve_point(degree, knots, control_points, u) );
		}
	
	}

	return p;

}

//
// ####rational_curve_adaptive_sample( degree, knots, control_points, tol, include_u )
//
// Sample a NURBS curve assuming parameterization 0 to 1, corresponds to http://ariel.chronotext.org/dd/defigueiredo93adaptive.pdf
//
// **params**
// + *Number*, integer degree
// + *Array*, array of nondecreasing knot values 
// + *Array*, 2d array of homogeneous control points, where each control point is an array of length (dim+1) 
// and form (wi*pi, wi) 
// + *Number*, tolerance for the adaptive scheme
// + *Boolean*, whether to prefix the point with the parameter
// 
// **returns** 
// + *Array*, an array of dim + 1 length where the first element is the param where it was sampled and the remaining the pt
//

verb.eval.nurbs.rational_curve_adaptive_sample = function( degree, knots, control_points, tol, include_u ) {

	// if degree is 1, just return the dehomogenized control points
	if (degree === 1){ 
		if ( !include_u ) {
			return control_points.map( verb.eval.nurbs.dehomogenize );
		} else {
			// the first element of each array is the parameter
			return control_points.map(function(x, i){
				return [ knots[i+1] ].concat( verb.eval.nurbs.dehomogenize( x ) );
			});
		}
	}

	return verb.eval.nurbs.rational_curve_adaptive_sample_range( degree, knots, control_points, 0, 1.0, tol, include_u );

}

//
// ####rational_curve_adaptive_sample_range( degree, knots, control_points, start_u, end_u, tol, include_u )
//
// Sample a NURBS curve at 3 points, facilitating adaptive sampling
//
// **params**
// + *Number*, integer degree
// + *Array*, array of nondecreasing knot values 
// + *Array*, 2d array of homogeneous control points, where each control point is an array of length (dim+1) 
// and form (wi*pi, wi) 
// + *Number*, start parameter for sampling
// + *Number*, end parameter for sampling
// + *Boolean*, whether to prefix the point with the parameter
// 
// **returns** 
// + *Array*, an array of dim + 1 length where the first element is the param where it was sampled and the remaining the pt
//

verb.eval.nurbs.rational_curve_adaptive_sample_range = function( degree, knots, control_points, start_u, end_u, tol, include_u ) {

	// sample curve at three pts
	var p1 = verb.eval.nurbs.rational_curve_point(degree, knots, control_points, start_u),
		p3 = verb.eval.nurbs.rational_curve_point(degree, knots, control_points, end_u),
		t = 0.5 + 0.2 * Math.random(),
		mid_u = start_u + (end_u - start_u) * t,
		p2 = verb.eval.nurbs.rational_curve_point(degree, knots, control_points, mid_u);

		// if the two end control points are coincident, the three point test will always return 0, let's split the curve
		var diff = numeric.sub( p1, p3);
		var diff2 = numeric.sub( p1, p2);

		// the first condition checks if the curve makes up a loop, if so, we will need to continue evaluation
		if ( ( numeric.dot( diff, diff ) < tol && numeric.dot( diff2, diff2 ) > tol ) || !verb.eval.nurbs.three_points_are_flat( p1, p2, p3, tol ) ) {

			// get the exact middle
			var exact_mid_u = start_u + (end_u - start_u) * 0.5;

			// recurse on the two halves
			var left_pts = verb.eval.nurbs.rational_curve_adaptive_sample_range( degree, knots, control_points, start_u, exact_mid_u, tol, include_u )
				, right_pts = verb.eval.nurbs.rational_curve_adaptive_sample_range( degree, knots, control_points, exact_mid_u, end_u, tol, include_u );

			// concatenate the two		
			return left_pts.slice(0, -1).concat(right_pts);

		} else {

			if (include_u){
				return [ 	[ start_u ].concat(p1) , [end_u].concat(p3) ];
			} else {
				return [ 	p1, p3 ];
			}

		}
}






//
// ####three_points_are_flat( p1, p2, p3, tol )
//
// Determine if three points form a straight line within a given tolerance for their 2 * squared area
//
//          * p2
//         / \
//        /   \
//       /     \ 
//      /       \
//     * p1 ---- * p3
//
// The area metric is 2 * the squared norm of the cross product of two edges, requiring no square roots and no divisions
//
// **params**
// + *Array*, p1
// + *Array*, p2
// + *Array*, p3
// + *Number*, The tolerance for whether the three points form a line
//
// **returns** 
// + *Number*, Whether the triangle passes the test
//
verb.eval.nurbs.three_points_are_flat = function( p1, p2, p3, tol ) {


	// find the area of the triangle without using a square root
	var p2mp1 = numeric.sub( p2, p1 )
		, p3mp1 = numeric.sub( p3, p1 )
		, norm = crossprod( p2mp1, p3mp1 )
		, area = numeric.dot( norm, norm );

	return area < tol;

}

function getEastNeighbor(index, i, j, min_divs_u, min_divs_v, divs){
	
	if (j === min_divs_v - 1){
		return null;
	}

	return divs[ index + 1 ];

}

function getNorthNeighbor(index, i, j, min_divs_u, min_divs_v, divs){

	if (i === 0){
		return null;
	}

	return divs[ index - min_divs_v ];

}

function getSouthNeighbor(index, i, j, min_divs_u, min_divs_v, divs){

	if (i === min_divs_u - 1){
		return null;
	}

	return divs[ index + min_divs_v ];

}

function getWestNeighbor(index, i, j, min_divs_u, min_divs_v, divs){

	if (j === 0){
		return null;
	}

	return divs[ index - 1 ];

}

verb.eval.nurbs.divide_rational_surface_adaptive = function( degree_u, knots_u, degree_v, knots_v, homo_control_points, options ) {

	// degree_u, knots_u, degree_v, knots_v, homo_control_points, 
	var srf = {
		degree_u: degree_u,
		knots_u: knots_u,
		degree_v: degree_v,
		knots_v: knots_v,
		homo_control_points: homo_control_points
	};

	var min_divs_u = options.minDivsU;
	var min_divs_v = options.minDivsV;

	// get necessary intervals
	var max_u = Math.max.apply(null, knots_u);
	var min_u = Math.min.apply(null, knots_u);
	var max_v = Math.max.apply(null, knots_v);
	var min_v = Math.min.apply(null, knots_v);

	var u_interval = (max_u - min_u) / min_divs_u
		, v_interval = (max_v - min_v) / min_divs_v;

	var divs = [];

	// make all of the nodes
	for (var i = 0; i < min_divs_u; i++){
		for (var j = 0; j < min_divs_v; j++){

			var u0 = min_u + u_interval * i
				, u1 = min_u + u_interval * (i + 1)
				, v0 = min_v + v_interval * j
				, v1 = min_v + v_interval * (j + 1);

		  divs.push( new verb.eval.nurbs.AdaptiveRefinementNode( srf, u0, u1, v0, v1, null, null ) );

		}
	}

	// assign all of the neighbors and divide
	for (var i = 0; i < min_divs_u; i++){
		for (var j = 0; j < min_divs_v; j++){

			var index = i * min_divs_v + j
				, n = getNorthNeighbor( index, i, j, min_divs_u, min_divs_v, divs )
				, e = getEastNeighbor( index, i, j, min_divs_u, min_divs_v, divs  )
				, s = getSouthNeighbor( index, i, j, min_divs_u, min_divs_v, divs )
				, w = getWestNeighbor( index, i, j, min_divs_u, min_divs_v, divs  );

		  divs[index].neighbors = [ n, e, s, w ];

		  divs.divide( options );

		}
	}

	return divs;

}

verb.eval.nurbs.is_rational_surface_domain_flat = function(srf, u0, u1, v0, v1, options ){

	var max_crv_diff = options.maxCurvatureDifference || 0.01;

	// get curvature at all corners of the surface
	var type = "gaussian";

	var a = verb.eval.nurbs.rational_surface_curvature( srf.degree_u, 
																											srf.knots_u, 
																											srf.degree_v, 
																											srf.knots_v, 
																											srf.homo_control_points, 
																											u0, v0 );

	var b = verb.eval.nurbs.rational_surface_curvature( srf.degree_u, 
																											srf.knots_u, 
																											srf.degree_v, 
																											srf.knots_v, 
																											srf.homo_control_points, 
																											u1, v0 );

	var c = verb.eval.nurbs.rational_surface_curvature( srf.degree_u, 
																											srf.knots_u, 
																											srf.degree_v, 
																											srf.knots_v, 
																											srf.homo_control_points, 
																											u1, v1 );

	var d = verb.eval.nurbs.rational_surface_curvature( srf.degree_u, 
																											srf.knots_u, 
																											srf.degree_v, 
																											srf.knots_v, 
																											srf.homo_control_points, 
																											u0, v1 );

	var e = verb.eval.nurbs.rational_surface_curvature( srf.degree_u, 
																											srf.knots_u, 
																											srf.degree_v, 
																											srf.knots_v, 
																											srf.homo_control_points, 
																											(u0 + u1) / 2, (v0 + v1) / 2 );

	var curvatures = [ a.mean, b.mean, c.mean, d.mean, e.mean ];
	var points = [ a.point, b.point, c.point, d.point, e.point ];

	// if any of the curvatures are greater than threshold - return false
	for (var i = 0; i < 5; i++){
		for (var j = i+1; j < 5; j++){
			if ( Math.abs( curvatures[i] - curvatures[j] ) > curvatureDifference ){
				return false;
			}
		}
	}

	return true;

	// var eval_srf = verb.eval.nurbs.rational_surface_point
	// 	, u_half_step = (u[1] - u[0] / 2) * ( Math.random() * 0.1 + 1 )
	// 	, v_half_step = (v[1] - v[0] / 2) * ( Math.random() * 0.1 + 1 )
	// 	, p1 = eval_srf( srf.degree_u, srf.knots_u, srf.degree_v, srf.knots_v, srf.homo_control_points, u[0], v[0] )
	// 	, p2 = eval_srf( srf.degree_u, srf.knots_u, srf.degree_v, srf.knots_v, srf.homo_control_points, u[0] + u_half_step, v[0] + v_half_step )
	// 	, p3 = eval_srf( srf.degree_u, srf.knots_u, srf.degree_v, srf.knots_v, srf.homo_control_points, u[1], v[1] );

	// return verb.eval.nurbs.three_points_are_flat( p1, p2 , p3, tol );

}

verb.eval.nurbs.triangulate_adaptive_refinement_node_tree = function( arrTree ){

	// triangulate all of the nodes of the tree
	var mesh = { uvs : [], points : [], normals : [], faces : [] };
	mesh.faces = arrTree.map(function(x){  x.triangulate( mesh ); }).flatten();
	return mesh;

};

verb.eval.nurbs.tesselate_rational_surface_adaptive = function( degree_u, knots_u, degree_v, knots_v, homo_control_points, options ) {

	// division step
	var arrArray = verb.eval.nurbs.divide_rational_surface_adaptive( degree_u, knots_u, degree_v, knots_v, homo_control_points, options );

	// triangulation step
	var res = verb.eval.nurbs.triangulate_adaptive_refinement_node_tree( arrTree );

	return verb.eval.nurbs.unique_mesh( res );

}

verb.eval.nurbs.unique_mesh = function( mesh ) {

	return mesh;

}


Array.prototype.where = function( predicate ){

	if (this.length === 0) return this;

	var res = [];

	for (var i = 0; i < this.length; i++){
		if ( predicate( this[i] ) ) res.push( this[i] );
	}

	return res;

}

verb.eval.nurbs.AdaptiveRefinementNode = function( srf, u0, u1, v0, v1, parentNode, neighbors ) {

	// 
	// Structure of the child nodes
	// in the adaptive refinement tree
  //      
  //  +--> u
  //  |
  //  v
  //  v
  // 
  //                        neighbors[0]
  //
	//                (u0,v0)---(u05,v0)---(u1,v0)
	//                  |           |          |
	//                  |     0     |     1    |
	//                  |           |          |
	// neighbors[3]   (u0,v05)--(u05,v05)--(u1,v05)   neighbors[1] 
	//                  |           |          | 
	//                  |     3     |     2    |
	//                  |           |          |
	//                (u0,v1)---(u05,v1)---(u1,v1)
	//
	//                        neighbors[2]
	//

	this.srf = srf;
	this.u0 = u0;
	this.u1 = u1;
	this.v0 = v0;
	this.v1 = v1;
	this.parentNode = parentNode;
	this.neighbors = neighbors;
	this.leafEdgeUvs = [[ u0, v0 ], [ u1, v0 ], [ u1, v1 ], [ u0, v1 ]];
	this.cachedEdgeUvs = [];

}

verb.eval.nurbs.AdaptiveRefinementNode.prototype.isLeaf = function(){
	return (this.children === undefined);
};


verb.eval.nurbs.AdaptiveRefinementNode.prototype.evalSurface = function( uv ){

	var derivs = verb.eval.nurbs.rational_surface_derivs( this.srf.degree_u, 
																												this.srf.knots_u, 
																												this.srf.degree_v, 
																												this.srf.knots_v, 
																												this.srf.homo_control_points, 
																												1, 
																												pt_u, 
																												pt_v );
	var pt = derivs[0][0];

	points.push( pt );

	var normal = numeric.cross(  derivs[0][1], derivs[1][0] );

	return { point: pt, normal: normal };

};


verb.eval.nurbs.AdaptiveRefinementNode.prototype.getEdgeUvs = function( edgeIndex ){

	// if its a leaf, there are no children to obtain uvs from
	if ( this.isLeaf() ) return [ this.leafEdgeUvs[ edgeIndex ] ]

	// get the uvs owned by the children along this edge
	this.cachedEdgeUvs[edgeIndex] = this.cachedEdgeUvs[edgeIndex] || this.children[ edgeIndex ].getEdgeUvs( edgeIndex )
																						 												.concat( this.children[ (edgeIndex + 1) % 4 ].getEdgeUvs( edgeIndex ));
	return this.cachedEdgeUvs[edgeIndex];
};

verb.eval.nurbs.AdaptiveRefinementNode.prototype.getAllEdgeUvs = function( edgeIndex ){

	var baseArr = [ this.leafEdgeUvs[edgeIndex] ];

	if ( this.neighbors[edgeIndex] === null ) return baseArr;

	// get opposite edges uvs
	var uvs = this.neighbors[edgeIndex].getEdgeUvs( ( edgeIndex + 2 ) % 4 );

	var funcIndex = edgeIndex % 2;

	var that = this;

	// range clipping functions
	var rangeFuncMap = [
		function(x){ return x[0] > that.u0 + verb.EPSILON && x[0] < that.u1 - verb.EPSILON; },
		function(x){ return x[1] > that.v0 + verb.EPSILON && x[1] < that.v1 - verb.EPSILON; }
	];

	// clip the range of uvs to match this one
	return baseArr.concat( uvs.where( rangeFuncMap[ funcIndex ] ).reverse() ) ;

};

verb.eval.nurbs.AdaptiveRefinementNode.prototype.triangulateLeaf = function( mesh ){

		var baseIndex = mesh.points.length - 1;

		var uvs = [];

		// enumerate all uvs in counter clockwise direction
		for (var i = 0; i < 4; i++){
			uvs.concat( this.getAllEdgeUvs(i) ); 
		}

		uvs.forEach(function(x){
			mesh.uvs.push(x);
			var point = this.evalSurface( x );

			mesh.points.push( point.point );
			mesh.normals.push( point.normal );

		});

		if (uvs.length === 4){

			// if the number of points is 4, we're just doing a
			// rectangle - just build the basic triangulated square
			mesh.faces.push( [ baseIndex + 1, baseIndex + 4, baseIndex + 2 ] );
			mesh.faces.push( [ baseIndex + 4, baseIndex + 3, baseIndex + 2 ] );

			// all done ;)
			return;

		}

		this.u05 = this.u05 || (this.u0 + this.u1) / 2;
		this.v05 = this.v05 || (this.v0 + this.v1) / 2;

		// make point at center of face
		mesh.uvs.push( [  this.u05, this.v05 ] );
		var center = this.evalSurface( [ this.u05, this.v05 ] );
		mesh.points.push( center.point );
		mesh.normals.push( center.normal );

		// get index 
		var centerIndex = mesh.points.length - 1;

		// build triangle fan from center
		for (var i = 0; i < uvs.length; i++){

			mesh.faces.push( [	centerIndex, 
													(baseIndex + i + 2) % uvs.length, 
													(baseIndex + i + 1) % uvs.length   ]);

		}

};

verb.eval.nurbs.AdaptiveRefinementNode.prototype.triangulate = function( mesh ){

	if ( this.isLeaf() ) return this.triangulateLeaf( mesh );

	// recurse on the children
	this.children.forEach(function(x){
		if (x === null) return;
		x.triangulate( mesh );
	});

};

verb.eval.nurbs.AdaptiveRefinementNode.prototype.shouldDivide = function( options, currentDepth ){

	if ( ( options.minDepth && currentDepth < options.minDepth ) ){
		return true;
	}

	if ( this.srf && !verb.eval.nurbs.is_rational_surface_domain_flat( this.srf, this.u0, this.u1, this.v0, this.v1, options ) ){
		return true;
	}

	return false;

}

verb.eval.nurbs.AdaptiveRefinementNode.prototype.divide = function( options, currentDepth ){

	// initialize currentDepth if it's not present
	if (currentDepth === undefined) currentDepth = 0;

	if ( !this.shouldDivide( options, currentDepth )  ) return;

	// increment the depth
	currentDepth++;

	// divide the domain
	this.u05 = (this.u0 + this.u1) / 2;
	this.v05 = (this.v0 + this.v1) / 2;

	// create the children
	this.children = [ 	new verb.eval.nurbs.AdaptiveRefinementNode( this.srf, this.u0, this.u05, 	this.v0, 	this.v05, this ),
											new verb.eval.nurbs.AdaptiveRefinementNode( this.srf, this.u05, this.u1, 	this.v0, 	this.v05, this ),
											new verb.eval.nurbs.AdaptiveRefinementNode( this.srf, this.u05, this.u1, 	this.v05, this.v1, 	this ),
											new verb.eval.nurbs.AdaptiveRefinementNode( this.srf, this.u0, 	this.u05, this.v05, this.v1, 	this ) ];

	// correctly assign neighbors
	this.children[0].neighbors = [ this.neighbors[0], this.children[1], this.children[3], this.neighbors[3] ];
	this.children[1].neighbors = [ this.neighbors[0], this.neighbors[1], this.children[2], this.children[0] ];
	this.children[2].neighbors = [ this.children[1], this.neighbors[1], this.neighbors[2], this.children[3] ];
	this.children[3].neighbors = [ this.children[0], this.children[2], this.neighbors[2], this.neighbors[3] ];

	// divide all children recursively
	this.children.forEach(function(x){ x.divide( options,currentDepth ); })

};


