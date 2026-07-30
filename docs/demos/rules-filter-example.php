<?php
// Display twin of docs/.vitepress/theme/rulesDemoScopes.ts — the docs engine
// runs these exact rules; this is what they look like as the WordPress filter.
add_filter( 'arts_cursor_follower/options', function ( $options ) {
	$options['targetScopes'][] = array(
		'scope' => '.demo-rules-scope',
		'rules' => array(
			array(
				'selector' => ':scope .demo-rules-card',
				'payload'  => array(
					'shape' => 'pill',
					'label' => __( 'Open', 'my-theme' ),
				),
			),
		),
	);

	return $options;
} );
