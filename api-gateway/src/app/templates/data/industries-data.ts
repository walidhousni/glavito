/**
 * Industry Templates Data
 * Comprehensive configurations for 10 industries
 */

export const industriesData = [
  // ============================================
  // 1. E-COMMERCE
  // ============================================
  {
    industry: 'e-commerce',
    name: 'E-commerce Complete Setup',
    description: 'Complete support system for online retail businesses with order tracking, returns handling, and customer service automation.',
    icon: 'https://img.icons8.com/color/96/shopping-cart.png',
    color: '#10B981',
    isActive: true,
    isGlobal: true,
    
    customFieldsSchema: {
      ticket: [
        {
          name: 'order_number',
          label: 'Order Number',
          type: 'text',
          required: false,
          group: 'Order Information',
          icon: 'https://img.icons8.com/color/48/receipt.png',
          placeholder: 'Enter order number',
          helpText: 'Customer order reference number'
        },
        {
          name: 'order_status',
          label: 'Order Status',
          type: 'select',
          required: false,
          group: 'Order Information',
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'processing', label: 'Processing' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'returned', label: 'Returned' },
            { value: 'refunded', label: 'Refunded' }
          ]
        },
        {
          name: 'tracking_number',
          label: 'Tracking Number',
          type: 'text',
          required: false,
          group: 'Shipping',
          placeholder: 'Enter tracking number'
        },
        {
          name: 'shipping_carrier',
          label: 'Shipping Carrier',
          type: 'select',
          required: false,
          group: 'Shipping',
          options: [
            { value: 'ups', label: 'UPS' },
            { value: 'fedex', label: 'FedEx' },
            { value: 'usps', label: 'USPS' },
            { value: 'dhl', label: 'DHL' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          name: 'return_reason',
          label: 'Return Reason',
          type: 'select',
          required: false,
          group: 'Returns',
          options: [
            { value: 'wrong_item', label: 'Wrong Item' },
            { value: 'damaged', label: 'Damaged' },
            { value: 'not_as_described', label: 'Not as Described' },
            { value: 'size_issue', label: 'Size Issue' },
            { value: 'changed_mind', label: 'Changed Mind' }
          ]
        },
        {
          name: 'refund_amount',
          label: 'Refund Amount',
          type: 'number',
          required: false,
          group: 'Returns',
          validation: { min: 0 }
        }
      ],
      customer: [
        {
          name: 'lifetime_value',
          label: 'Lifetime Value',
          type: 'number',
          required: false,
          group: 'Customer Metrics',
          readOnly: true
        },
        {
          name: 'total_orders',
          label: 'Total Orders',
          type: 'number',
          required: false,
          group: 'Customer Metrics',
          readOnly: true
        },
        {
          name: 'loyalty_tier',
          label: 'Loyalty Tier',
          type: 'select',
          required: false,
          group: 'Loyalty Program',
          options: [
            { value: 'bronze', label: 'Bronze' },
            { value: 'silver', label: 'Silver' },
            { value: 'gold', label: 'Gold' },
            { value: 'platinum', label: 'Platinum' }
          ]
        }
      ]
    },
    
    workflowTemplates: [
      {
        name: 'Order Confirmation',
        description: 'Send order confirmation automatically when order is created',
        type: 'automation',
        triggers: ['ticket.created'],
        conditions: [
          {
            field: 'customFields.order_number',
            operator: 'is_not_empty'
          }
        ],
        actions: [
          {
            type: 'send_message',
            config: {
              channel: 'email',
              template: 'order_confirmation',
              to: '{{customer.email}}'
            }
          }
        ],
        isActive: true,
        priority: 10
      },
      {
        name: 'Shipping Notification',
        description: 'Notify customer when order ships',
        type: 'automation',
        triggers: ['ticket.updated'],
        conditions: [
          {
            field: 'customFields.order_status',
            operator: 'equals',
            value: 'shipped'
          }
        ],
        actions: [
          {
            type: 'send_message',
            config: {
              channel: 'email',
              template: 'shipping_notification',
              to: '{{customer.email}}'
            }
          },
          {
            type: 'send_message',
            config: {
              channel: 'sms',
              message: 'Your order {{customFields.order_number}} has shipped! Track it: {{customFields.tracking_number}}'
            }
          }
        ],
        isActive: true,
        priority: 10
      },
      {
        name: 'Return Request Handler',
        description: 'Automate return request processing',
        type: 'automation',
        triggers: ['ticket.created'],
        conditions: [
          {
            field: 'tags',
            operator: 'contains',
            value: 'return'
          }
        ],
        actions: [
          {
            type: 'update_ticket',
            config: {
              priority: 'high',
              status: 'pending'
            }
          },
          {
            type: 'assign_to_team',
            config: {
              teamName: 'Returns Team'
            }
          },
          {
            type: 'send_message',
            config: {
              channel: 'email',
              template: 'return_request_received'
            }
          }
        ],
        isActive: true,
        priority: 15
      }
    ],
    
    slaTemplates: [
      {
        name: 'Standard E-commerce SLA',
        description: 'Standard response times for e-commerce support',
        priority: 'medium',
        conditions: [],
        targets: {
          firstResponseTime: 60, // 1 hour
          resolutionTime: 1440 // 24 hours
        },
        isActive: true
      },
      {
        name: 'High Priority Orders',
        description: 'Fast response for premium customers and urgent orders',
        priority: 'high',
        conditions: [
          {
            field: 'customer.loyalty_tier',
            operator: 'in',
            value: ['gold', 'platinum']
          }
        ],
        targets: {
          firstResponseTime: 30, // 30 minutes
          resolutionTime: 480 // 8 hours
        },
        isActive: true
      }
    ],
    
    routingRules: {
      defaultStrategy: {
        name: 'E-commerce Routing',
        strategy: 'skill-based',
        configuration: {
          skills: {
            'order-management': 3,
            'returns-handling': 2,
            'shipping-issues': 2
          }
        }
      },
      additionalRules: [
        {
          name: 'Route Returns to Returns Team',
          priority: 10,
          conditions: [
            {
              field: 'tags',
              operator: 'contains',
              value: 'return'
            }
          ],
          actions: [
            {
              type: 'assign_to_team',
              teamName: 'Returns Team'
            }
          ]
        }
      ]
    },
    
    dashboardLayouts: {
      agent: {
        widgets: ['my_tickets', 'pending_returns', 'urgent_orders', 'recent_activity']
      },
      manager: {
        widgets: ['team_performance', 'order_volume', 'return_rate', 'csat_score', 'sla_compliance']
      }
    },
    
    analyticsPresets: [
      {
        name: 'Order Volume by Day',
        category: 'Orders',
        definition: {
          metric: 'ticket_count',
          filters: { tags: ['order'] },
          groupBy: 'date',
          visualization: 'line_chart'
        }
      },
      {
        name: 'Return Rate',
        category: 'Returns',
        definition: {
          metric: 'percentage',
          numerator: { tags: ['return'] },
          denominator: { tags: ['order'] },
          visualization: 'gauge'
        }
      }
    ],
    
    pipelineStages: {
      leads: {
        name: 'E-commerce Lead Pipeline',
        stages: [
          { name: 'New Lead', color: '#3B82F6' },
          { name: 'Contacted', color: '#8B5CF6' },
          { name: 'Cart Abandoned', color: '#F59E0B' },
          { name: 'First Purchase', color: '#10B981' },
          { name: 'Loyal Customer', color: '#059669' }
        ]
      }
    },
    
    automationRecipes: [],
    
    integrationPacks: ['shopify', 'woocommerce', 'magento', 'stripe', 'paypal'],
    
    portalTheme: {
      branding: {
        primaryColor: '#10B981',
        secondaryColor: '#059669'
      }
    }
  },

  // ============================================
  // 2. AUTOMOTIVE
  // ============================================
  {
    industry: 'automotive',
    name: 'Automotive Service Center',
    description: 'Complete support system for auto dealerships and service centers with appointment scheduling, service history, and warranty management.',
    icon: 'https://img.icons8.com/color/96/car.png',
    color: '#EF4444',
    isActive: true,
    isGlobal: true,
    
    customFieldsSchema: {
      ticket: [
        {
          name: 'vin',
          label: 'VIN',
          type: 'text',
          required: false,
          group: 'Vehicle Information',
          validation: { pattern: '^[A-HJ-NPR-Z0-9]{17}$' },
          helpText: '17-character Vehicle Identification Number'
        },
        {
          name: 'make',
          label: 'Make',
          type: 'text',
          required: false,
          group: 'Vehicle Information'
        },
        {
          name: 'model',
          label: 'Model',
          type: 'text',
          required: false,
          group: 'Vehicle Information'
        },
        {
          name: 'year',
          label: 'Year',
          type: 'number',
          required: false,
          group: 'Vehicle Information',
          validation: { min: 1900, max: 2030 }
        },
        {
          name: 'mileage',
          label: 'Current Mileage',
          type: 'number',
          required: false,
          group: 'Vehicle Information'
        },
        {
          name: 'service_type',
          label: 'Service Type',
          type: 'select',
          required: false,
          group: 'Service',
          options: [
            { value: 'oil_change', label: 'Oil Change' },
            { value: 'tire_rotation', label: 'Tire Rotation' },
            { value: 'brake_service', label: 'Brake Service' },
            { value: 'inspection', label: 'Inspection' },
            { value: 'repair', label: 'Repair' },
            { value: 'warranty', label: 'Warranty Claim' }
          ]
        },
        {
          name: 'appointment_date',
          label: 'Appointment Date',
          type: 'date',
          required: false,
          group: 'Service'
        },
        {
          name: 'warranty_status',
          label: 'Warranty Status',
          type: 'select',
          required: false,
          group: 'Warranty',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'pending', label: 'Pending Approval' }
          ]
        }
      ],
      customer: [
        {
          name: 'preferred_service_location',
          label: 'Preferred Location',
          type: 'text',
          required: false,
          group: 'Preferences'
        },
        {
          name: 'service_history_count',
          label: 'Service Visits',
          type: 'number',
          required: false,
          group: 'History',
          readOnly: true
        }
      ]
    },
    
    workflowTemplates: [
      {
        name: 'Service Appointment Reminder',
        description: 'Send reminder 24 hours before appointment',
        type: 'automation',
        triggers: ['schedule.daily'],
        conditions: [
          {
            field: 'customFields.appointment_date',
            operator: 'equals',
            value: '{{tomorrow}}'
          }
        ],
        actions: [
          {
            type: 'send_message',
            config: {
              channel: 'sms',
              message: 'Reminder: Your vehicle service appointment is tomorrow at {{customFields.appointment_date}}'
            }
          }
        ]
      },
      {
        name: 'Warranty Claim Processing',
        description: 'Auto-route warranty claims to warranty team',
        type: 'automation',
        triggers: ['ticket.created'],
        conditions: [
          {
            field: 'customFields.service_type',
            operator: 'equals',
            value: 'warranty'
          }
        ],
        actions: [
          {
            type: 'assign_to_team',
            config: { teamName: 'Warranty Team' }
          },
          {
            type: 'update_ticket',
            config: { priority: 'high' }
          }
        ]
      }
    ],
    
    slaTemplates: [
      {
        name: 'Automotive Service SLA',
        priority: 'medium',
        conditions: [],
        targets: {
          firstResponseTime: 120, // 2 hours
          resolutionTime: 2880 // 48 hours
        }
      }
    ],
    
    routingRules: {
      defaultStrategy: {
        name: 'Automotive Routing',
        strategy: 'skill-based',
        configuration: {
          skills: {
            'service-advisor': 3,
            'warranty-specialist': 2,
            'parts-specialist': 2
          }
        }
      }
    },
    
    dashboardLayouts: {
      agent: {
        widgets: ['todays_appointments', 'pending_services', 'warranty_claims']
      },
      manager: {
        widgets: ['daily_appointments', 'service_completion_rate', 'customer_satisfaction']
      }
    },
    
    analyticsPresets: [
      {
        name: 'Service Appointments by Day',
        category: 'Operations',
        definition: {
          metric: 'ticket_count',
          filters: { tags: ['appointment'] },
          groupBy: 'date'
        }
      }
    ],
    
    pipelineStages: {
      leads: {
        name: 'Vehicle Sales Pipeline',
        stages: [
          { name: 'Initial Inquiry', color: '#3B82F6' },
          { name: 'Test Drive Scheduled', color: '#8B5CF6' },
          { name: 'Negotiation', color: '#F59E0B' },
          { name: 'Financing', color: '#10B981' },
          { name: 'Sold', color: '#059669' }
        ]
      }
    },
    
    automationRecipes: [],
    integrationPacks: ['dealersocket', 'cdk', 'stripe'],
    portalTheme: {
      branding: {
        primaryColor: '#EF4444',
        secondaryColor: '#DC2626'
      }
    }
  },

  // ============================================
  // 3. HEALTHCARE
  // ============================================
  {
    industry: 'healthcare',
    name: 'Healthcare Patient Support',
    description: 'HIPAA-compliant support system for healthcare providers with appointment management, prescription refills, and patient communication.',
    icon: 'https://img.icons8.com/color/96/hospital.png',
    color: '#3B82F6',
    isActive: true,
    isGlobal: true,
    
    customFieldsSchema: {
      ticket: [
        {
          name: 'patient_id',
          label: 'Patient ID',
          type: 'text',
          required: false,
          group: 'Patient Information',
          helpText: 'Internal patient identifier'
        },
        {
          name: 'date_of_birth',
          label: 'Date of Birth',
          type: 'date',
          required: false,
          group: 'Patient Information'
        },
        {
          name: 'appointment_type',
          label: 'Appointment Type',
          type: 'select',
          required: false,
          group: 'Appointments',
          options: [
            { value: 'new_patient', label: 'New Patient' },
            { value: 'follow_up', label: 'Follow-up' },
            { value: 'annual_checkup', label: 'Annual Checkup' },
            { value: 'specialist', label: 'Specialist' },
            { value: 'telehealth', label: 'Telehealth' }
          ]
        },
        {
          name: 'appointment_datetime',
          label: 'Appointment Date & Time',
          type: 'date',
          required: false,
          group: 'Appointments'
        },
        {
          name: 'provider_name',
          label: 'Provider',
          type: 'text',
          required: false,
          group: 'Appointments'
        },
        {
          name: 'prescription_name',
          label: 'Prescription',
          type: 'text',
          required: false,
          group: 'Prescriptions'
        },
        {
          name: 'pharmacy_name',
          label: 'Pharmacy',
          type: 'text',
          required: false,
          group: 'Prescriptions'
        },
        {
          name: 'insurance_provider',
          label: 'Insurance Provider',
          type: 'text',
          required: false,
          group: 'Insurance'
        },
        {
          name: 'insurance_status',
          label: 'Insurance Status',
          type: 'select',
          required: false,
          group: 'Insurance',
          options: [
            { value: 'verified', label: 'Verified' },
            { value: 'pending', label: 'Pending Verification' },
            { value: 'declined', label: 'Declined' }
          ]
        }
      ],
      customer: [
        {
          name: 'preferred_contact_method',
          label: 'Preferred Contact',
          type: 'select',
          required: false,
          group: 'Communication Preferences',
          options: [
            { value: 'phone', label: 'Phone' },
            { value: 'email', label: 'Email' },
            { value: 'sms', label: 'SMS' },
            { value: 'portal', label: 'Patient Portal' }
          ]
        },
        {
          name: 'primary_care_physician',
          label: 'Primary Care Physician',
          type: 'text',
          required: false,
          group: 'Medical Information'
        }
      ]
    },
    
    workflowTemplates: [
      {
        name: 'Appointment Reminder',
        description: 'Send appointment reminders 24 hours in advance',
        type: 'automation',
        triggers: ['schedule.daily'],
        conditions: [
          {
            field: 'customFields.appointment_datetime',
            operator: 'equals',
            value: '{{tomorrow}}'
          }
        ],
        actions: [
          {
            type: 'send_message',
            config: {
              channel: 'sms',
              message: 'Reminder: You have an appointment tomorrow with {{customFields.provider_name}}'
            }
          }
        ]
      },
      {
        name: 'Prescription Refill Request',
        description: 'Route prescription refill requests to pharmacy team',
        type: 'automation',
        triggers: ['ticket.created'],
        conditions: [
          {
            field: 'tags',
            operator: 'contains',
            value: 'prescription'
          }
        ],
        actions: [
          {
            type: 'assign_to_team',
            config: { teamName: 'Pharmacy Team' }
          },
          {
            type: 'send_message',
            config: {
              channel: 'email',
              template: 'prescription_refill_received'
            }
          }
        ]
      }
    ],
    
    slaTemplates: [
      {
        name: 'Healthcare Standard SLA',
        priority: 'medium',
        conditions: [],
        targets: {
          firstResponseTime: 120, // 2 hours
          resolutionTime: 1440 // 24 hours
        }
      },
      {
        name: 'Urgent Medical Inquiries',
        priority: 'critical',
        conditions: [
          {
            field: 'priority',
            operator: 'equals',
            value: 'urgent'
          }
        ],
        targets: {
          firstResponseTime: 15, // 15 minutes
          resolutionTime: 120 // 2 hours
        }
      }
    ],
    
    routingRules: {
      defaultStrategy: {
        name: 'Healthcare Routing',
        strategy: 'skill-based',
        configuration: {
          skills: {
            'patient-coordination': 3,
            'billing-specialist': 2,
            'medical-records': 2
          }
        }
      }
    },
    
    dashboardLayouts: {
      agent: {
        widgets: ['todays_appointments', 'pending_refills', 'insurance_verifications']
      },
      manager: {
        widgets: ['appointment_volume', 'patient_satisfaction', 'response_times', 'hipaa_compliance']
      }
    },
    
    analyticsPresets: [
      {
        name: 'Daily Appointments',
        category: 'Operations',
        definition: {
          metric: 'ticket_count',
          filters: { tags: ['appointment'] },
          groupBy: 'date'
        }
      },
      {
        name: 'Patient Satisfaction Score',
        category: 'Quality',
        definition: {
          metric: 'csat_average',
          visualization: 'gauge'
        }
      }
    ],
    
    pipelineStages: {},
    automationRecipes: [],
    integrationPacks: ['epic', 'cerner', 'stripe'],
    portalTheme: {
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#2563EB'
      }
    }
  },

  // ============================================
  // 4. REAL ESTATE
  // ============================================
  {
    industry: 'real-estate',
    name: 'Real Estate Agency',
    description: 'Complete CRM and support system for real estate agencies with property inquiry management, viewing scheduling, and deal tracking.',
    icon: 'https://img.icons8.com/color/96/home.png',
    color: '#8B5CF6',
    isActive: true,
    isGlobal: true,
    
    customFieldsSchema: {
      ticket: [
        {
          name: 'property_id',
          label: 'Property ID',
          type: 'text',
          required: false,
          group: 'Property Information'
        },
        {
          name: 'property_address',
          label: 'Property Address',
          type: 'text',
          required: false,
          group: 'Property Information'
        },
        {
          name: 'property_type',
          label: 'Property Type',
          type: 'select',
          required: false,
          group: 'Property Information',
          options: [
            { value: 'house', label: 'House' },
            { value: 'apartment', label: 'Apartment' },
            { value: 'condo', label: 'Condo' },
            { value: 'land', label: 'Land' },
            { value: 'commercial', label: 'Commercial' }
          ]
        },
        {
          name: 'listing_price',
          label: 'Listing Price',
          type: 'number',
          required: false,
          group: 'Property Information',
          validation: { min: 0 }
        },
        {
          name: 'viewing_date',
          label: 'Viewing Date',
          type: 'date',
          required: false,
          group: 'Showings'
        },
        {
          name: 'offer_amount',
          label: 'Offer Amount',
          type: 'number',
          required: false,
          group: 'Offers',
          validation: { min: 0 }
        },
        {
          name: 'offer_status',
          label: 'Offer Status',
          type: 'select',
          required: false,
          group: 'Offers',
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'countered', label: 'Counter Offer' }
          ]
        }
      ],
      customer: [
        {
          name: 'budget_min',
          label: 'Budget (Min)',
          type: 'number',
          required: false,
          group: 'Buying Preferences'
        },
        {
          name: 'budget_max',
          label: 'Budget (Max)',
          type: 'number',
          required: false,
          group: 'Buying Preferences'
        },
        {
          name: 'preferred_areas',
          label: 'Preferred Areas',
          type: 'text',
          required: false,
          group: 'Buying Preferences'
        },
        {
          name: 'financing_approved',
          label: 'Financing Approved',
          type: 'boolean',
          required: false,
          group: 'Financing'
        }
      ]
    },
    
    workflowTemplates: [
      {
        name: 'Viewing Confirmation',
        description: 'Send viewing confirmation to client',
        type: 'automation',
        triggers: ['ticket.updated'],
        conditions: [
          {
            field: 'customFields.viewing_date',
            operator: 'is_not_empty'
          }
        ],
        actions: [
          {
            type: 'send_message',
            config: {
              channel: 'email',
              template: 'viewing_confirmation'
            }
          }
        ]
      },
      {
        name: 'New Property Inquiry',
        description: 'Route property inquiries to assigned agent',
        type: 'automation',
        triggers: ['ticket.created'],
        conditions: [
          {
            field: 'tags',
            operator: 'contains',
            value: 'property-inquiry'
          }
        ],
        actions: [
          {
            type: 'auto_assign',
            config: { strategy: 'round-robin' }
          }
        ]
      }
    ],
    
    slaTemplates: [
      {
        name: 'Real Estate Response SLA',
        priority: 'medium',
        conditions: [],
        targets: {
          firstResponseTime: 180, // 3 hours
          resolutionTime: 2880 // 48 hours
        }
      }
    ],
    
    routingRules: {
      defaultStrategy: {
        name: 'Real Estate Routing',
        strategy: 'round-robin',
        configuration: {}
      }
    },
    
    dashboardLayouts: {
      agent: {
        widgets: ['my_listings', 'upcoming_viewings', 'active_offers', 'new_inquiries']
      },
      manager: {
        widgets: ['total_listings', 'viewings_scheduled', 'offers_pending', 'closed_deals']
      }
    },
    
    analyticsPresets: [
      {
        name: 'Viewing Conversion Rate',
        category: 'Sales',
        definition: {
          metric: 'percentage',
          numerator: { tags: ['offer-accepted'] },
          denominator: { tags: ['viewing'] },
          visualization: 'gauge'
        }
      }
    ],
    
    pipelineStages: {
      leads: {
        name: 'Property Sales Pipeline',
        stages: [
          { name: 'New Inquiry', color: '#3B82F6' },
          { name: 'Viewing Scheduled', color: '#8B5CF6' },
          { name: 'Offer Made', color: '#F59E0B' },
          { name: 'Under Contract', color: '#10B981' },
          { name: 'Closed', color: '#059669' }
        ]
      }
    },
    
    automationRecipes: [],
    integrationPacks: ['mls', 'zillow', 'stripe'],
    portalTheme: {
      branding: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#7C3AED'
      }
    }
  },

  // ============================================
  // 5. HOSPITALITY
  // ============================================
  {
    industry: 'hospitality',
    name: 'Hotel & Hospitality',
    description: 'Guest services platform for hotels and resorts with reservation management, guest requests, and feedback collection.',
    icon: 'https://img.icons8.com/color/96/hotel.png',
    color: '#F59E0B',
    isActive: true,
    isGlobal: true,
    
    customFieldsSchema: {
      ticket: [
        {
          name: 'reservation_number',
          label: 'Reservation Number',
          type: 'text',
          required: false,
          group: 'Reservation'
        },
        {
          name: 'check_in_date',
          label: 'Check-in Date',
          type: 'date',
          required: false,
          group: 'Reservation'
        },
        {
          name: 'check_out_date',
          label: 'Check-out Date',
          type: 'date',
          required: false,
          group: 'Reservation'
        },
        {
          name: 'room_number',
          label: 'Room Number',
          type: 'text',
          required: false,
          group: 'Reservation'
        },
        {
          name: 'room_type',
          label: 'Room Type',
          type: 'select',
          required: false,
          group: 'Reservation',
          options: [
            { value: 'standard', label: 'Standard' },
            { value: 'deluxe', label: 'Deluxe' },
            { value: 'suite', label: 'Suite' },
            { value: 'penthouse', label: 'Penthouse' }
          ]
        },
        {
          name: 'special_request',
          label: 'Special Request',
          type: 'textarea',
          required: false,
          group: 'Guest Preferences'
        },
        {
          name: 'dietary_restrictions',
          label: 'Dietary Restrictions',
          type: 'text',
          required: false,
          group: 'Guest Preferences'
        }
      ],
      customer: [
        {
          name: 'loyalty_status',
          label: 'Loyalty Status',
          type: 'select',
          required: false,
          group: 'Loyalty Program',
          options: [
            { value: 'member', label: 'Member' },
            { value: 'silver', label: 'Silver' },
            { value: 'gold', label: 'Gold' },
            { value: 'platinum', label: 'Platinum' }
          ]
        },
        {
          name: 'total_stays',
          label: 'Total Stays',
          type: 'number',
          required: false,
          group: 'Guest History',
          readOnly: true
        }
      ]
    },
    
    workflowTemplates: [
      {
        name: 'Pre-arrival Email',
        description: 'Send welcome email 24 hours before check-in',
        type: 'automation',
        triggers: ['schedule.daily'],
        conditions: [
          {
            field: 'customFields.check_in_date',
            operator: 'equals',
            value: '{{tomorrow}}'
          }
        ],
        actions: [
          {
            type: 'send_message',
            config: {
              channel: 'email',
              template: 'pre_arrival_welcome'
            }
          }
        ]
      },
      {
        name: 'Post-stay Feedback',
        description: 'Request feedback after checkout',
        type: 'automation',
        triggers: ['schedule.daily'],
        conditions: [
          {
            field: 'customFields.check_out_date',
            operator: 'equals',
            value: '{{yesterday}}'
          }
        ],
        actions: [
          {
            type: 'send_message',
            config: {
              channel: 'email',
              template: 'post_stay_survey'
            }
          }
        ]
      }
    ],
    
    slaTemplates: [
      {
        name: 'Guest Services SLA',
        priority: 'medium',
        conditions: [],
        targets: {
          firstResponseTime: 30, // 30 minutes
          resolutionTime: 240 // 4 hours
        }
      }
    ],
    
    routingRules: {
      defaultStrategy: {
        name: 'Hospitality Routing',
        strategy: 'skill-based',
        configuration: {
          skills: {
            'concierge': 3,
            'housekeeping': 2,
            'front-desk': 3
          }
        }
      }
    },
    
    dashboardLayouts: {
      agent: {
        widgets: ['todays_arrivals', 'guest_requests', 'room_issues']
      },
      manager: {
        widgets: ['occupancy_rate', 'guest_satisfaction', 'service_requests', 'revenue']
      }
    },
    
    analyticsPresets: [
      {
        name: 'Guest Satisfaction Score',
        category: 'Quality',
        definition: {
          metric: 'csat_average',
          visualization: 'gauge'
        }
      }
    ],
    
    pipelineStages: {},
    automationRecipes: [],
    integrationPacks: ['booking.com', 'expedia', 'stripe'],
    portalTheme: {
      branding: {
        primaryColor: '#F59E0B',
        secondaryColor: '#D97706'
      }
    }
  },

  // ============================================
  // 6-10: Abbreviated versions for SaaS, Finance, Education, Retail, Manufacturing
  // ============================================
  {
    industry: 'saas',
    name: 'SaaS Support System',
    description: 'Technical support platform for SaaS companies with bug tracking, feature requests, and onboarding assistance.',
    icon: 'https://img.icons8.com/color/96/cloud.png',
    color: '#6366F1',
    isActive: true,
    isGlobal: true,
    customFieldsSchema: {
      ticket: [
        { name: 'account_id', label: 'Account ID', type: 'text', required: false, group: 'Account' },
        { name: 'subscription_tier', label: 'Subscription Tier', type: 'select', required: false, group: 'Account', options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }] },
        { name: 'issue_type', label: 'Issue Type', type: 'select', required: false, group: 'Issue', options: [{ value: 'bug', label: 'Bug' }, { value: 'feature_request', label: 'Feature Request' }, { value: 'question', label: 'Question' }] }
      ]
    },
    workflowTemplates: [],
    slaTemplates: [{ name: 'SaaS Support SLA', priority: 'medium', conditions: [], targets: { firstResponseTime: 60, resolutionTime: 720 } }],
    routingRules: { defaultStrategy: { name: 'SaaS Routing', strategy: 'skill-based', configuration: {} } },
    dashboardLayouts: { agent: { widgets: ['my_tickets', 'bug_reports'] }, manager: { widgets: ['ticket_volume', 'csat_score'] } },
    analyticsPresets: [],
    pipelineStages: {},
    automationRecipes: [],
    integrationPacks: ['stripe', 'intercom', 'slack'],
    portalTheme: { branding: { primaryColor: '#6366F1' } }
  },

  {
    industry: 'finance',
    name: 'Financial Services',
    description: 'Secure support platform for financial institutions with account management and transaction support.',
    icon: 'https://img.icons8.com/color/96/bank.png',
    color: '#059669',
    isActive: true,
    isGlobal: true,
    customFieldsSchema: {
      ticket: [
        { name: 'account_number', label: 'Account Number', type: 'text', required: false, group: 'Account' },
        { name: 'transaction_id', label: 'Transaction ID', type: 'text', required: false, group: 'Transaction' }
      ]
    },
    workflowTemplates: [],
    slaTemplates: [{ name: 'Finance SLA', priority: 'high', conditions: [], targets: { firstResponseTime: 30, resolutionTime: 240 } }],
    routingRules: { defaultStrategy: { name: 'Finance Routing', strategy: 'skill-based', configuration: {} } },
    dashboardLayouts: { agent: { widgets: ['my_tickets'] }, manager: { widgets: ['ticket_volume'] } },
    analyticsPresets: [],
    pipelineStages: {},
    automationRecipes: [],
    integrationPacks: ['stripe', 'plaid', 'quickbooks'],
    portalTheme: { branding: { primaryColor: '#059669' } }
  },

  {
    industry: 'education',
    name: 'Educational Institution',
    description: 'Student support platform for schools and universities with enrollment, course, and administrative support.',
    icon: 'https://img.icons8.com/color/96/graduation-cap.png',
    color: '#EC4899',
    isActive: true,
    isGlobal: true,
    customFieldsSchema: {
      ticket: [
        { name: 'student_id', label: 'Student ID', type: 'text', required: false, group: 'Student' },
        { name: 'course_name', label: 'Course', type: 'text', required: false, group: 'Academic' }
      ]
    },
    workflowTemplates: [],
    slaTemplates: [{ name: 'Education SLA', priority: 'medium', conditions: [], targets: { firstResponseTime: 120, resolutionTime: 1440 } }],
    routingRules: { defaultStrategy: { name: 'Education Routing', strategy: 'skill-based', configuration: {} } },
    dashboardLayouts: { agent: { widgets: ['my_tickets'] }, manager: { widgets: ['ticket_volume'] } },
    analyticsPresets: [],
    pipelineStages: {},
    automationRecipes: [],
    integrationPacks: ['canvas', 'blackboard', 'stripe'],
    portalTheme: { branding: { primaryColor: '#EC4899' } }
  },

  {
    industry: 'retail',
    name: 'Retail Store',
    description: 'In-store and online retail support with inventory, returns, and customer service.',
    icon: 'https://img.icons8.com/color/96/shop.png',
    color: '#14B8A6',
    isActive: true,
    isGlobal: true,
    customFieldsSchema: {
      ticket: [
        { name: 'store_location', label: 'Store Location', type: 'text', required: false, group: 'Store' },
        { name: 'product_sku', label: 'Product SKU', type: 'text', required: false, group: 'Product' }
      ]
    },
    workflowTemplates: [],
    slaTemplates: [{ name: 'Retail SLA', priority: 'medium', conditions: [], targets: { firstResponseTime: 60, resolutionTime: 480 } }],
    routingRules: { defaultStrategy: { name: 'Retail Routing', strategy: 'skill-based', configuration: {} } },
    dashboardLayouts: { agent: { widgets: ['my_tickets'] }, manager: { widgets: ['ticket_volume'] } },
    analyticsPresets: [],
    pipelineStages: {},
    automationRecipes: [],
    integrationPacks: ['square', 'shopify', 'stripe'],
    portalTheme: { branding: { primaryColor: '#14B8A6' } }
  },

  {
    industry: 'manufacturing',
    name: 'Manufacturing & Industrial',
    description: 'Support platform for manufacturing with equipment maintenance, quality control, and supply chain management.',
    icon: 'https://img.icons8.com/color/96/factory.png',
    color: '#F97316',
    isActive: true,
    isGlobal: true,
    customFieldsSchema: {
      ticket: [
        { name: 'equipment_id', label: 'Equipment ID', type: 'text', required: false, group: 'Equipment' },
        { name: 'maintenance_type', label: 'Maintenance Type', type: 'select', required: false, group: 'Maintenance', options: [{ value: 'preventive', label: 'Preventive' }, { value: 'corrective', label: 'Corrective' }] }
      ]
    },
    workflowTemplates: [],
    slaTemplates: [{ name: 'Manufacturing SLA', priority: 'high', conditions: [], targets: { firstResponseTime: 60, resolutionTime: 480 } }],
    routingRules: { defaultStrategy: { name: 'Manufacturing Routing', strategy: 'skill-based', configuration: {} } },
    dashboardLayouts: { agent: { widgets: ['my_tickets'] }, manager: { widgets: ['ticket_volume'] } },
    analyticsPresets: [],
    pipelineStages: {},
    automationRecipes: [],
    integrationPacks: ['sap', 'oracle', 'quickbooks'],
    portalTheme: { branding: { primaryColor: '#F97316' } }
  }
];

