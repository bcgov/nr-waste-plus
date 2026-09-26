package ca.bc.gov.nrs.hrs.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Enables Spring task scheduling across the application. */
@Configuration
@EnableScheduling
public class SchedulingConfiguration {}

